import { MLCEngine, InitProgressCallback, ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { aiMemory } from "./aiMemory";
import { tts } from "./tts";
import { orchestrator } from "./agentOrchestrator";

export interface AIActionContext {
  onNavigate: (url: string) => void;
  onExecuteScript: (script: string) => Promise<any>;
  onCreateTab: (url: string) => void;
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
  onGetAllTabs: () => { id: string, title: string, url: string }[];
  onScrollPage: (direction: "up"|"down"|"top"|"bottom", amount?: number) => void;
  onPressKey: (key: string) => void;
  onTakeScreenshot: () => Promise<string>;
  onWait: (ms: number) => Promise<void>;
  onGetPageLinks: () => Promise<{text: string, href: string}[]>;
  onSearchHistory: (query: string) => { title: string; url: string }[];
}

export type InitProgressHandler = (progress: number, text: string) => void;

// Shared DOM scanning script — extracted to avoid duplicating 40 lines in every tool call
const DOM_SCAN_SCRIPT = `(() => {
  const allInteractive = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])');
  const visibleEls = [];
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  
  for (const el of allInteractive) {
    if (visibleEls.length >= 20) break; // Don't process more than we need to avoid freezing the renderer
    
    const rect = el.getBoundingClientRect();
    // Only process elements that are visible in the current viewport
    if (rect.width > 0 && rect.height > 0 && rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0) {
      const style = window.getComputedStyle(el);
      if (style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0') {
        visibleEls.push(el);
      }
    }
  }
  
  let currentId = 1;
  const items = visibleEls.map(el => {
    const aiId = currentId++;
    el.setAttribute('data-ai-id', aiId.toString());
    let text = el.innerText?.trim() || el.getAttribute('aria-label') || el.title || el.placeholder || el.value || '';
    text = text.replace(/\\s+/g, ' ');
    if (text.length > 50) text = text.substring(0, 50) + '...';
    
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type');
    
    return {
      ai_id: aiId.toString(),
      tag,
      ...(type && { type }),
      ...(text && { text })
    };
  });
  
  const text = document.body.innerText.replace(/\\s+/g, ' ').substring(0, 500);
  return JSON.stringify({ text, interactable_elements: items });
})();`;

// Maximum number of messages to keep in the conversation history for inference
const MAX_HISTORY_MESSAGES = 12;

class AIAgent {
  private engine: MLCEngine | null = null;
  private actionContext: AIActionContext | null = null;
  private isInitializing = false;
  private isInterrupted = false;
  
  public interrupt() {
    this.isInterrupted = true;
    if (this.engine) {
      this.engine.interruptGenerate();
    }
  }
  
  // We MUST use a Hermes model because WebLLM only supports function calling on Hermes fine-tunes in this version.
  // Kept context window at 2048 to prevent the lag we experienced earlier.
  private modelId = "Hermes-3-Llama-3.1-8B-q4f16_1-MLC"; 

  private getThemeColor(): string {
    try {
      const stored = localStorage.getItem('nova_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        const color = settings.accentColor;
        switch(color) {
          case 'emerald': return '#10b981';
          case 'purple': return '#a855f7';
          case 'rose': return '#f43f5e';
          case 'amber': return '#f59e0b';
          case 'blue': default: return '#3b82f6';
        }
      }
    } catch(e) {}
    return '#3b82f6';
  }

  // The tools (functions) we expose to the AI
  private readonly tools: any[] = [
    {
      type: "function",
      function: {
        name: "navigate_to_url",
        description: "Navigates the browser to a URL or searches Google if given a search query. After navigating, use read_page_content to verify the page loaded correctly.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "Full URL (e.g. https://google.com) or a search query like 'weather in istanbul'" },
          },
          required: ["url"],
        },
      }
    },
    {
      type: "function",
      function: {
        name: "read_page_content",
        description: "Extracts visible text from the current webpage. Use this to understand the page before clicking or after navigating.",
        parameters: { type: "object", properties: {} },
      }
    },
    {
      type: "function",
      function: {
        name: "get_page_url",
        description: "Returns the current URL and title of the active browser tab.",
        parameters: { type: "object", properties: {} },
      }
    },
    {
      type: "function",
      function: {
        name: "click_element",
        description: "Clicks an element on the page. Use CSS selector or visible text to identify the element.",
        parameters: {
          type: "object",
          properties: {
            ai_id: { type: "string", description: "The numeric ID of the element from read_page_content (e.g. '1', '24')" },
            fallback_text: { type: "string", description: "Optional: visible text content of the element to find and click if ID doesn't work" }
          },
          required: [],
        },
      }
    },
    {
      type: "function",
      function: {
        name: "fill_input",
        description: "Types text into an input field, textarea or search box.",
        parameters: {
          type: "object",
          properties: {
            ai_id: { type: "string", description: "The numeric ID of the input element from read_page_content" },
            value: { type: "string", description: "The text to type into the input" },
            submit: { type: "boolean", description: "If true, presses Enter after filling" }
          },
          required: ["ai_id", "value"],
        },
      }
    },
    {
      type: "function",
      function: {
        name: "scroll_page",
        description: "Scrolls the page up or down.",
        parameters: {
          type: "object",
          properties: {
            direction: { type: "string", enum: ["down", "up", "top", "bottom"], description: "Scroll direction" },
            amount: { type: "number", description: "Pixels to scroll (default 600)" }
          },
          required: ["direction"],
        },
      }
    },
    {
      type: "function",
      function: {
        name: "speak_text",
        description: "Reads text aloud using text-to-speech. Use when user says 'sesli oku', 'oku', 'read aloud' or similar. First call read_page_content to get page text, then call speak_text with that text.",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text to speak aloud" },
            lang: { type: "string", description: "Language code: 'tr-TR' for Turkish, 'en-US' for English. Detect from text content." }
          },
          required: ["text"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "stop_speaking",
        description: "Stops any ongoing text-to-speech reading immediately.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "save_to_memory",
        description: "Saves an important fact or user preference into persistent memory for future conversations.",
        parameters: {
          type: "object",
          properties: {
            fact: { type: "string", description: "Concise fact to remember (e.g. 'User prefers Turkish responses')" },
            category: { type: "string", enum: ["preference", "fact", "instruction"] }
          },
          required: ["fact"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_from_memory",
        description: "Deletes a specific memory item by ID.",
        parameters: {
          type: "object",
          properties: {
            memoryId: { type: "string", description: "ID of the memory item to delete" }
          },
          required: ["memoryId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_tab",
        description: "Opens a new browser tab and navigates to the given URL.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to open in the new tab" }
          },
          required: ["url"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "close_tab",
        description: "Closes a specific browser tab by its ID. Cannot close the last remaining tab.",
        parameters: {
          type: "object",
          properties: {
            tabId: { type: "string", description: "The ID of the tab to close" }
          },
          required: ["tabId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "switch_tab",
        description: "Switches focus to a specific browser tab by its ID.",
        parameters: {
          type: "object",
          properties: {
            tabId: { type: "string", description: "The ID of the tab to switch to" }
          },
          required: ["tabId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_all_tabs",
        description: "Returns a list of all currently open browser tabs, including their IDs, titles, and URLs.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "scroll_page",
        description: "Scrolls the active browser tab.",
        parameters: {
          type: "object",
          properties: {
            direction: { type: "string", enum: ["up", "down", "top", "bottom"], description: "The direction to scroll" },
            amount: { type: "number", description: "The amount of pixels to scroll (only used for up/down)" }
          },
          required: ["direction"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "press_key",
        description: "Simulates pressing a keyboard key on the active tab (e.g., 'Enter', 'Escape').",
        parameters: {
          type: "object",
          properties: {
            key: { type: "string", description: "The key to press" }
          },
          required: ["key"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "take_screenshot",
        description: "Takes a screenshot of the active tab and extracts any visible text from the DOM. Use this if you need to visually analyze the page layout or understand what the user sees.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "wait",
        description: "Waits for a specified amount of time (in milliseconds) before proceeding. Use this when waiting for a page to load or an animation to finish.",
        parameters: {
          type: "object",
          properties: {
            ms: { type: "number", description: "Milliseconds to wait" }
          },
          required: ["ms"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_page_links",
        description: "Returns a list of all visible links on the page along with their text. Useful for navigating the current site.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "manage_tabs",
        description: "Manage browser tabs. You can create a new tab, close an existing tab, or switch to a different tab.",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create", "close", "switch", "list"], description: "The action to perform on tabs." },
            tabId: { type: "string", description: "The ID of the tab to close or switch to. Required for 'close' and 'switch'." },
            url: { type: "string", description: "The URL to open if action is 'create'." }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "auto_fill_form",
        description: "Automatically fills all inputs in a form using the user's stored Memory Vault information. Call this when you detect a large form that needs filling.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "search_history",
        description: "Searches the user's browser history and bookmarks for a given query or topic. The AI can use this to remember past pages the user visited.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The keyword or topic to search for in titles or URLs." }
          },
          required: ["query"]
        }
      }
    }
  ];

  public isReady(): boolean {
    return this.engine !== null;
  }

  public setActionContext(context: AIActionContext) {
    this.actionContext = context;
  }

  private initPromise: Promise<void> | null = null;

  public async init(onProgress?: InitProgressHandler) {
    if (this.engine) return; // Already ready

    // If init is already running, wait for it instead of returning silently
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInit(onProgress);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInit(onProgress?: InitProgressHandler) {
    this.isInitializing = true;
    try {
      const initProgressCallback: InitProgressCallback = (initProgress) => {
        if (onProgress) {
          onProgress(initProgress.progress * 100, initProgress.text);
        }
      };

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      const worker = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), { type: 'module' });
      this.engine = await CreateWebWorkerMLCEngine(worker, this.modelId, {
        initProgressCallback,
        context_window_size: 2048
      } as any) as any;

    } catch (err) {
      console.error("Failed to initialize AI Engine:", err);
      this.engine = null;
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  public async handleToolCall(toolCall: any): Promise<string> {
    if (!toolCall || !toolCall.function || typeof toolCall.function.name !== 'string') {
      return JSON.stringify({ error: "Invalid tool call format" });
    }
    if (!this.actionContext) {
      return JSON.stringify({ error: "Action context not set" });
    }

    const functionName = toolCall.function.name;
    let args: any = {};
    try {
      if (typeof toolCall.function.arguments === 'string') {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } else if (toolCall.function.arguments && typeof toolCall.function.arguments === 'object') {
        args = toolCall.function.arguments;
      }
    } catch (e) {
      console.error('[AI Agent] Failed to parse tool call arguments:', e);
      args = {};
    }
    if (!args || typeof args !== 'object') {
      args = {};
    }

    console.log(`[AI Agent] Executing ${functionName} with args:`, args);

    if (!this.actionContext) {
      return JSON.stringify({ error: "Action context not set. Browser APIs unavailable." });
    }

    try {
      // Pause execution and ask for user approval before doing the action
      const approved = await orchestrator.enqueueAction(functionName, args);
      if (!approved) {
        const actionList = orchestrator.getQueue();
        if (actionList.length > 0) {
          orchestrator.updateActionState(actionList[actionList.length - 1].id, 'denied');
        }
        return JSON.stringify({ error: "User denied the action." });
      }

      // Find the action id to update state
      const actionList = orchestrator.getQueue();
      const currentAction = actionList[actionList.length - 1];
      orchestrator.updateActionState(currentAction.id, 'executing');

      let result: any;

      if (functionName === "navigate_to_url") {
        let url = args.url as string;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.includes('.')) {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Ensure the URL doesn't have raw spaces which breaks the webview
        try {
          url = new URL(url).href;
        } catch (e) {
          // If it fails to parse even after adding https, fallback to a google search
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }

        this.actionContext.onNavigate(url);
        await new Promise(r => setTimeout(r, 2500));
        
        // Auto-read page content using the shared scan script
        const pageData = await this.actionContext.onExecuteScript(DOM_SCAN_SCRIPT);
        
        result = { 
          success: true, 
          navigatedTo: url, 
          pageData: typeof pageData === 'string' ? JSON.parse(pageData) : pageData,
          hint: "SUCCESS. The page is now open and the content/selectors are provided above. DO NOT call navigate_to_url again! Next, use fill_input to interact with an input, or answer the user." 
        };
      }

      else if (functionName === "read_page_content") {
        const data = await this.actionContext.onExecuteScript(DOM_SCAN_SCRIPT);
        result = { success: true, pageData: JSON.parse(data) };
      }

      else if (functionName === "get_page_url") {
        const data = await this.actionContext.onExecuteScript(`JSON.stringify({ url: window.location.href, title: document.title });`);
        result = { success: true, ...JSON.parse(data) };
      }

      else if (functionName === "click_element") {
        const { ai_id, fallback_text } = args;
        const colorHex = this.getThemeColor();
        const script = `(async () => {
          let el = null;
          if (${JSON.stringify(ai_id)}) {
            el = document.querySelector('[data-ai-id="' + ${JSON.stringify(ai_id)} + '"]');
          }
          if (!el && ${JSON.stringify(fallback_text ?? '')}) {
            const allEls = document.querySelectorAll('a, button, [role="button"], input[type="submit"], label');
            for (const candidate of allEls) {
              if (candidate.textContent?.trim().toLowerCase().includes(${JSON.stringify((fallback_text ?? '').toLowerCase())})) {
                el = candidate;
                break;
              }
            }
          }
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 400)); // wait for scroll to settle
            
            try {
              const rect = el.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const color = '${colorHex}';
              
              // 1. Setup Cursor
              const cursor = document.createElement('div');
              cursor.style.position = 'fixed';
              cursor.style.top = (window.innerHeight + 50) + 'px';
              cursor.style.left = (window.innerWidth + 50) + 'px';
              cursor.style.width = '28px';
              cursor.style.height = '28px';
              cursor.style.zIndex = '2147483647';
              cursor.style.pointerEvents = 'none';
              cursor.style.transition = 'top 0.6s cubic-bezier(0.22, 1, 0.36, 1), left 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.2s ease, opacity 0.3s ease';
              cursor.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"><path d="M4.68114 2.85243C4.24647 2.21323 3.32839 2.45784 3.20816 3.24584L1.07724 17.1994C0.97034 17.8997 1.70613 18.4239 2.34863 18.106L8.14088 15.2415C8.36737 15.1295 8.63155 15.1274 8.85974 15.2359L15.3406 18.3188C15.986 18.6258 16.7118 18.082 16.5911 17.3813L14.2882 4.02008C14.1528 3.23438 13.2209 2.99343 12.7885 3.63319L4.68114 2.85243Z" fill="' + color + '" stroke="white" stroke-width="1.5"/></svg>';
              document.body.appendChild(cursor);
              
              // 2. Setup Target Highlight Box
              const highlight = document.createElement('div');
              highlight.style.position = 'fixed';
              highlight.style.top = (rect.top - 4) + 'px';
              highlight.style.left = (rect.left - 4) + 'px';
              highlight.style.width = (rect.width + 8) + 'px';
              highlight.style.height = (rect.height + 8) + 'px';
              highlight.style.pointerEvents = 'none';
              highlight.style.zIndex = '2147483646';
              highlight.style.transition = 'all 0.3s ease';
              highlight.style.borderRadius = '6px';
              highlight.style.opacity = '0';
              highlight.style.border = '2px solid ' + color;
              highlight.style.backgroundColor = color + '20';
              highlight.style.boxShadow = '0 0 15px ' + color + '60';
              document.body.appendChild(highlight);
              
              await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
              cursor.style.top = centerY + 'px';
              cursor.style.left = centerX + 'px';
              
              await new Promise(r => setTimeout(r, 450));
              
              highlight.style.opacity = '1';
              cursor.style.transform = 'scale(0.85)';
              
              await new Promise(r => setTimeout(r, 150));
              
              const ripple = document.createElement('div');
              ripple.style.position = 'fixed';
              ripple.style.top = centerY + 'px';
              ripple.style.left = centerX + 'px';
              ripple.style.width = '20px';
              ripple.style.height = '20px';
              ripple.style.backgroundColor = color + '90';
              ripple.style.borderRadius = '50%';
              ripple.style.transform = 'translate(-50%, -50%) scale(1)';
              ripple.style.zIndex = '2147483646';
              ripple.style.pointerEvents = 'none';
              ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
              document.body.appendChild(ripple);
              
              await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
              ripple.style.transform = 'translate(-50%, -50%) scale(8)';
              ripple.style.opacity = '0';
              
              setTimeout(() => {
                cursor.style.opacity = '0';
                highlight.style.opacity = '0';
                setTimeout(() => { cursor.remove(); highlight.remove(); ripple.remove(); }, 300);
              }, 300);
            } catch(e) {}
            
            el.click();
            return { success: true, clicked: el.tagName + (el.id ? '#' + el.id : '') };
          }
          return { error: 'Element not found', tried: { ai_id: ${JSON.stringify(ai_id)}, fallback_text: ${JSON.stringify(fallback_text)} } };
        })();`;
        const res = await this.actionContext.onExecuteScript(script);
        if (res.error) return JSON.stringify(res);
        await new Promise(r => setTimeout(r, 1000));
        res.hint = "Action completed. You MUST now call read_page_content to see the updated page state before doing anything else.";
        result = res;
      }

      else if (functionName === "fill_input") {
        const { ai_id, value, submit } = args;
        const colorHex = this.getThemeColor();
        const script = `(async () => {
          const el = document.querySelector('[data-ai-id="' + ${JSON.stringify(ai_id)} + '"]');
          if (!el) return { error: 'Input not found for ID: ' + ${JSON.stringify(ai_id)} };
          
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 400));
          
          try {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const color = '${colorHex}';
            
            // Highlight Box
            const highlight = document.createElement('div');
            highlight.style.position = 'fixed';
            highlight.style.top = (rect.top - 4) + 'px';
            highlight.style.left = (rect.left - 4) + 'px';
            highlight.style.width = (rect.width + 8) + 'px';
            highlight.style.height = (rect.height + 8) + 'px';
            highlight.style.pointerEvents = 'none';
            highlight.style.zIndex = '2147483646';
            highlight.style.transition = 'all 0.3s ease';
            highlight.style.borderRadius = '6px';
            highlight.style.opacity = '0';
            highlight.style.border = '2px solid ' + color;
            highlight.style.backgroundColor = color + '15';
            highlight.style.boxShadow = '0 0 15px ' + color + '40';
            document.body.appendChild(highlight);
            
            // Cursor
            const cursor = document.createElement('div');
            cursor.style.position = 'fixed';
            cursor.style.top = (window.innerHeight + 50) + 'px';
            cursor.style.left = (window.innerWidth + 50) + 'px';
            cursor.style.width = '28px';
            cursor.style.height = '28px';
            cursor.style.zIndex = '2147483647';
            cursor.style.pointerEvents = 'none';
            cursor.style.transition = 'top 0.6s cubic-bezier(0.22, 1, 0.36, 1), left 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease';
            cursor.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"><path d="M4.68114 2.85243C4.24647 2.21323 3.32839 2.45784 3.20816 3.24584L1.07724 17.1994C0.97034 17.8997 1.70613 18.4239 2.34863 18.106L8.14088 15.2415C8.36737 15.1295 8.63155 15.1274 8.85974 15.2359L15.3406 18.3188C15.986 18.6258 16.7118 18.082 16.5911 17.3813L14.2882 4.02008C14.1528 3.23438 13.2209 2.99343 12.7885 3.63319L4.68114 2.85243Z" fill="' + color + '" stroke="white" stroke-width="1.5"/></svg>';
            document.body.appendChild(cursor);
            
            // Move cursor
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            cursor.style.top = centerY + 'px';
            cursor.style.left = centerX + 'px';
            
            await new Promise(r => setTimeout(r, 450));
            highlight.style.opacity = '1';
            
            // Glassmorphism Type Tooltip
            const typeBox = document.createElement('div');
            typeBox.style.position = 'fixed';
            typeBox.style.top = (rect.top - 45) + 'px';
            typeBox.style.left = rect.left + 'px';
            typeBox.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            typeBox.style.backdropFilter = 'blur(10px)';
            typeBox.style.color = '#1e293b';
            typeBox.style.padding = '6px 12px';
            typeBox.style.borderRadius = '8px';
            typeBox.style.fontSize = '13px';
            typeBox.style.fontWeight = '600';
            typeBox.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            typeBox.style.zIndex = '2147483647';
            typeBox.style.pointerEvents = 'none';
            typeBox.style.border = '1px solid rgba(255,255,255,0.4)';
            typeBox.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            typeBox.innerHTML = '<span style="color:' + color + '">AI Typing:</span> <span id="ai-typing-text"></span><span id="ai-cursor" style="animation: blink 1s step-end infinite; color:' + color + '">|</span>';
            
            // Add keyframes for cursor blink if not exists
            if (!document.getElementById('ai-blink-style')) {
              const style = document.createElement('style');
              style.id = 'ai-blink-style';
              style.innerHTML = '@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }';
              document.head.appendChild(style);
            }
            
            typeBox.style.opacity = '0';
            typeBox.style.transform = 'translateY(10px)';
            typeBox.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            document.body.appendChild(typeBox);
            
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            typeBox.style.opacity = '1';
            typeBox.style.transform = 'translateY(0)';
            
            // Typewriter effect
            const textToType = ${JSON.stringify(value)};
            const spanText = document.getElementById('ai-typing-text');
            el.focus();
            el.value = '';
            
            for(let i=0; i<textToType.length; i++) {
              await new Promise(r => setTimeout(r, 20 + Math.random() * 30)); // random typing speed
              spanText.innerText += textToType[i];
              el.value += textToType[i];
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            await new Promise(r => setTimeout(r, 600));
            
            typeBox.style.opacity = '0';
            cursor.style.opacity = '0';
            highlight.style.opacity = '0';
            typeBox.style.transform = 'translateY(-10px)';
            setTimeout(() => { typeBox.remove(); cursor.remove(); highlight.remove(); }, 300);
          } catch(e) {}
          
          el.setAttribute('value', ${JSON.stringify(value)});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          if (${JSON.stringify(submit ?? false)}) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            const form = el.closest('form');
            if (form) {
              setTimeout(() => {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                if (form.dispatchEvent(submitEvent)) {
                  form.submit();
                }
              }, 100);
            }
          }
          return { success: true };
        })();`;
        const res = await this.actionContext.onExecuteScript(script);
        if (res.error) return JSON.stringify(res);
        await new Promise(r => setTimeout(r, 1000));
        res.hint = "Input filled. If you submitted the form, you MUST now call read_page_content to see the results.";
        result = res;
      }

      else if (functionName === "manage_tabs") {
        const { action, tabId, url } = args;
        if (action === "list") {
          const tabs = this.actionContext.onGetAllTabs();
          result = { success: true, tabs };
        } else if (action === "create") {
          this.actionContext.onCreateTab(url as string || "https://google.com");
          await new Promise(r => setTimeout(r, 1000));
          const tabs = this.actionContext.onGetAllTabs();
          result = { success: true, tabs, hint: "New tab created and focused. You can use navigate_to_url to open a specific page." };
        } else if (action === "close") {
          if (!tabId) throw new Error("tabId required to close tab");
          this.actionContext.onCloseTab(tabId as string);
          await new Promise(r => setTimeout(r, 500));
          const tabs = this.actionContext.onGetAllTabs();
          result = { success: true, tabs };
        } else if (action === "switch") {
          if (!tabId) throw new Error("tabId required to switch tab");
          this.actionContext.onSwitchTab(tabId as string);
          await new Promise(r => setTimeout(r, 500));
          result = { success: true, hint: "Switched to tab. Call read_page_content to see the content." };
        }
      }
      else if (functionName === "search_history") {
        const { query } = args;
        const results = this.actionContext.onSearchHistory(query as string || "");
        console.log(`[AI Agent] Searching history for: ${query}`);
        result = { success: true, results, hint: "Here are the top matches from history and bookmarks. If you find the link you need, you can navigate_to_url." };
      }

      else if (functionName === "auto_fill_form") {
        // Fetch inputs from the page
        const script = `(() => {
          return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            id: el.id
          }));
        })();`;
        const inputs = await this.actionContext.onExecuteScript(script);
        
        // Pass inputs and memories to the AI to decide what to fill
        const memories = aiMemory.getMemories().map(m => m.fact).join("\n");
        const prompt = `You are an auto-fill assistant.
Here is the user's memory vault:
${memories}

Here are the inputs on the page:
${JSON.stringify(inputs)}

Output a JSON array of objects with { "selector": "...", "value": "..." } for fields you can confidently fill. Output ONLY the JSON array, nothing else.`;

        console.log('[AI Agent] Auto-filling form...');
        
        const completion = await this.engine!.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1
        });
        
        let fillCommands = [];
        try {
          const jsonMatch = completion.choices[0].message.content?.match(/\[.*\]/s);
          if (jsonMatch) {
            fillCommands = JSON.parse(jsonMatch[0]);
          } else {
            fillCommands = JSON.parse(completion.choices[0].message.content || '[]');
          }
        } catch(e) {
          result = { error: "Failed to parse auto-fill mapping." };
        }

        if (fillCommands.length > 0) {
          for (const cmd of fillCommands) {
            if (cmd.selector && cmd.value) {
              await this.handleToolCall(
                { id: Math.random().toString(), type: "function", function: { name: "fill_input", arguments: JSON.stringify({ selector: cmd.selector, value: cmd.value }) } }
              );
            }
          }
          result = { success: true, filled: fillCommands.length, hint: "Form was auto-filled." };
        } else {
          result = { success: false, hint: "No matching fields found to auto-fill based on memory." };
        }
      }

      else if (functionName === "scroll_page") {
        const { direction, amount = 600 } = args;
        const script = `(async () => {
          // Visual Scanning Effect
          try {
            const scanner = document.createElement('div');
            scanner.style.position = 'fixed';
            scanner.style.top = '${direction === 'up' || direction === 'top' ? '100%' : '0'}';
            scanner.style.left = '0';
            scanner.style.width = '100%';
            scanner.style.height = '4px';
            scanner.style.backgroundColor = '#0ea5e9'; // sky-500
            scanner.style.boxShadow = '0 0 20px #0ea5e9, 0 0 40px #0ea5e9';
            scanner.style.zIndex = '9999999';
            scanner.style.pointerEvents = 'none';
            scanner.style.transition = 'top 0.8s ease-in-out, opacity 0.3s ease';
            document.body.appendChild(scanner);
            
            await new Promise(r => setTimeout(r, 50));
            scanner.style.top = '${direction === 'up' || direction === 'top' ? '0' : '100%'}';
            
            setTimeout(() => {
              scanner.style.opacity = '0';
              setTimeout(() => scanner.remove(), 300);
            }, 800);
          } catch(e) {}
        
          if ('${direction}' === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
          else if ('${direction}' === 'bottom') { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }
          else if ('${direction}' === 'up') { window.scrollBy({ top: -${amount}, behavior: 'smooth' }); }
          else { window.scrollBy({ top: ${amount}, behavior: 'smooth' }); }
          
          await new Promise(r => setTimeout(r, 800)); // wait for scroll to finish
          return { success: true, direction: '${direction}' };
        })();`;
        const res = await this.actionContext.onExecuteScript(script);
        result = res;
      }

      else if (functionName === "save_to_memory") {
        const { fact, category } = args;
        const memory = aiMemory.addMemory(fact, category || 'fact');
        result = { success: true, memory };
      }

      else if (functionName === "delete_from_memory") {
        const { memoryId } = args;
        aiMemory.deleteMemory(memoryId);
        result = { success: true };
      }

      else if (functionName === "speak_text") {
        const { text, lang = 'tr-TR' } = args;
        tts.speak(text, lang).catch(console.error);
        result = { success: true, speaking: true, chars: text.length };
      }

      else if (functionName === "stop_speaking") {
        tts.stop();
        result = { success: true, stopped: true };
      }

      else if (functionName === "create_tab") {
        this.actionContext.onCreateTab(args.url);
        result = { success: true, url: args.url };
      }

      else if (functionName === "close_tab") {
        this.actionContext.onCloseTab(args.tabId);
        result = { success: true, tabId: args.tabId };
      }

      else if (functionName === "switch_tab") {
        this.actionContext.onSwitchTab(args.tabId);
        result = { success: true, tabId: args.tabId };
      }

      else if (functionName === "get_all_tabs") {
        const tabs = this.actionContext.onGetAllTabs();
        result = { success: true, tabs };
      }

      else if (functionName === "press_key") {
        const { key } = args;
        this.actionContext.onPressKey(key);
        result = { success: true, key };
      }

      else if (functionName === "take_screenshot") {
        const base64 = await this.actionContext.onTakeScreenshot();
        result = { success: true, screenshotBase64Length: base64.length };
      }

      else if (functionName === "wait") {
        const { ms } = args;
        await this.actionContext.onWait(ms);
        result = { success: true, waitedMs: ms };
      }

      else if (functionName === "get_page_links") {
        const links = await this.actionContext.onGetPageLinks();
        result = { success: true, linksCount: links.length, links };
      }

      else {
        throw new Error(`Unknown function: ${functionName}`);
      }

      orchestrator.updateActionState(currentAction.id, 'completed', result);
      return JSON.stringify(result);

    } catch (err: any) {
      const actionList = orchestrator.getQueue();
      if (actionList.length > 0) {
        orchestrator.updateActionState(actionList[actionList.length - 1].id, 'failed', undefined, err.message);
      }
      return JSON.stringify({ error: err.message });
    }
  }

  public async chat(messages: ChatCompletionMessageParam[], onChunk?: (chunk: string) => void): Promise<ChatCompletionMessageParam[]> {
    if (!this.engine) throw new Error("Engine not initialized");
    this.isInterrupted = false;

    const systemInstruction = `\n\n[SYSTEM INSTRUCTION]
You are an advanced Browser AI Assistant.
Your tasks:
1. Help the user navigate the web and find information in English.
2. Use the provided TOOLS to read pages, click buttons, and fill forms.

CRITICAL RULES FOR TOOL USAGE:
- If asked to open a new tab, use 'manage_tabs' (action="create") INSTEAD OF 'navigate_to_url'!
- When you use 'navigate_to_url', the CURRENT PAGE CONTENT AND ELEMENTS (buttons, etc.) will AUTOMATICALLY be returned to you. DO NOT unnecessarily call 'read_page_content' right after navigating!
- NEVER call 'navigate_to_url' twice in a row. If you navigate to a page, interact with it (fill_input, click_element) or reply to the user.
- Do not leave the user's request half-done. If it's a multi-step task (e.g. search and summarize), first search, then read the page, then summarize.
- Always be concise. Never prolong unnecessarily.

MEMORY SYSTEM (CRITICAL): If the user gives you persistent info or a preference (e.g. "my name is Ali", "always speak English"), you MUST use the 'save_to_memory' tool to remember this for the future.\n`;

    // Inject memory prompt if present
    const memoryPrompt = aiMemory.getFormattedMemoryPrompt();
    
    // WebLLM Hermes blocks custom 'system' roles when tools are enabled, 
    // so we append our instructions to the last user message instead.
    const requestMessages = [...messages];
    
    if (requestMessages.length > 0) {
      const firstMsg = requestMessages[0];
      if (firstMsg.role === 'user' && typeof firstMsg.content === 'string') {
        requestMessages[0] = {
          ...firstMsg,
          content: systemInstruction + (memoryPrompt || '') + '\n\n[USER REQUEST]\n' + firstMsg.content
        };
      }
    }

    let isDone = false;
    let currentMessages = [...requestMessages];
    let toolsCalled = false;
    let lastToolName = '';
    let loopCount = 0;
    const MAX_LOOPS = 5; // Prevent infinite AI loops

    while (!isDone) {
      // Yield to the main thread so React can render and the browser doesn't freeze
      await new Promise(r => setTimeout(r, 100));

      loopCount++;
      if (loopCount > MAX_LOOPS) {
        currentMessages.push({ role: 'assistant', content: 'Sorry, I did too many operations and got confused. Please give me a clearer command.' } as ChatCompletionMessageParam);
        break;
      }

      if (this.isInterrupted) {
        currentMessages.push({ role: 'assistant', content: 'Process stopped by the user.' } as ChatCompletionMessageParam);
        break;
      }

      // Sliding window: keep only the last N messages to prevent WebGPU OOM
      let windowedMessages = currentMessages;
      if (currentMessages.length > MAX_HISTORY_MESSAGES) {
        // Always keep the first message (contains system instructions) and the last N
        windowedMessages = [
          currentMessages[0],
          ...currentMessages.slice(-MAX_HISTORY_MESSAGES + 1)
        ];
      }

      // Truncate old tool messages to prevent WebGPU OOM crashes
      const optimizedMessages = windowedMessages.map((msg, idx) => {
        if (msg.role === 'tool' && typeof msg.content === 'string' && msg.content.length > 300) {
          // If this is not one of the last 2 messages, truncate it heavily
          if (idx < windowedMessages.length - 2) {
            return { ...msg, content: '{"status":"done"}' };
          }
          // Even recent tool messages get truncated if extremely long
          if (msg.content.length > 8000) {
            return { ...msg, content: msg.content.substring(0, 8000) + '... (truncated)"}}' };
          }
        }
        return msg;
      });

      const reply = await this.engine.chat.completions.create({
        messages: optimizedMessages,
        tools: this.tools,
        tool_choice: "auto",
        stream: false
      });

      const responseMessage = reply.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        toolsCalled = true;
        currentMessages.push({
          ...responseMessage,
          content: responseMessage.content ?? '',
        } as ChatCompletionMessageParam);

        const toolNames = responseMessage.tool_calls.map(tc => tc.function.name).join(', ');
        if (onChunk) onChunk(`\n> *Tool running: ${toolNames}...*\n\n`);

        for (const toolCall of responseMessage.tool_calls) {
          const funcName = toolCall.function.name;
          let result;
          
          // Prevent infinite tool loops (calling same tool consecutively)
          if (this.isInterrupted) {
             result = JSON.stringify({ error: "Process cancelled." });
          } else if (funcName === lastToolName && responseMessage.tool_calls.length === 1) {
            result = JSON.stringify({ error: `CRITICAL ERROR: You just called '${funcName}' again! You are stuck in an infinite loop. You MUST call a different tool now (like read_page_content) or provide your final response to the user!` });
          } else {
            try {
              result = await this.handleToolCall(toolCall);
            } catch (toolErr: any) {
              console.error("[AI Agent] Tool call failed:", toolErr);
              result = JSON.stringify({ error: toolErr.message || String(toolErr) });
            }
          }
          
          currentMessages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
          
          lastToolName = funcName;
        }
        
        if (onChunk) onChunk('\n> *Agent thinking...*\n\n');
      } else {
        isDone = true;
        // Final response
        let content = (responseMessage.content as string) ?? '';
        if (toolsCalled && content.trim() === '') {
          content = "I have completed the requested operations.";
        }
        
        if (onChunk && content) {
          const words = content.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? '' : ' ') + words[i];
            onChunk(chunk);
            await new Promise(r => setTimeout(r, 18));
          }
        }
        currentMessages.push({ role: 'assistant', content } as ChatCompletionMessageParam);

        // Record Task Summary in background if tools were used
        // Defer by 3 seconds to let the GPU cool down and avoid contention with potential next user message
        if (toolsCalled && this.engine) {
          const engineRef = this.engine;
          const summaryMessages = [
            currentMessages[currentMessages.length - 1], // just the last assistant response
            { role: 'user', content: 'Briefly summarize the task you just completed in the browser in a single sentence. (e.g. "I searched Google and found the results")' }
          ];
          setTimeout(() => {
            engineRef.chat.completions.create({
              messages: summaryMessages as ChatCompletionMessageParam[],
              stream: false
            }).then(res => {
              const summary = res.choices[0]?.message?.content;
              if (summary) {
                console.log('[AI Task Summary]', summary);
                aiMemory.addTaskSummary(summary);
              }
            }).catch(console.error);
          }, 3000);
        }
      }
    }

    // Restore the original user message content so the system instructions don't show in the UI
    if (currentMessages.length > 0 && currentMessages[0].role === 'user') {
      currentMessages[0] = {
        ...currentMessages[0],
        content: messages[0].content
      } as ChatCompletionMessageParam;
    }

    return currentMessages;
  }

  // A fast, lightweight method exclusively for background tasks like Link Preview (No tools, no orchestrator)
  public async summarize(text: string): Promise<string> {
    if (!this.engine) throw new Error("Engine not initialized");
    
    const reply = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a fast summarization AI. Summarize the provided text in exactly 1 or 2 short sentences in English. Do NOT include any conversational filler like 'Here is the summary:' or 'Summary:'. ONLY return the summary text." },
        { role: "user", content: text }
      ],
      temperature: 0.3
    });
    
    return reply.choices[0].message.content || "";
  }
}

export const aiAgent = new AIAgent();

import type { MLCEngine, InitProgressCallback, ChatCompletionMessageParam } from "@mlc-ai/web-llm";
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

export interface AIModelOption {
  id: string;
  name: string;
  size: string;
  speed: string;
  description: string;
  isDefault?: boolean;
}

export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B (Onerilen)",
    size: "~800 MB",
    speed: "Cok Hizli",
    description: "Hafif, akilli ve Turkce/Ingilizce akici asistan",
    isDefault: true
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B (Ultra Hafif)",
    size: "~350 MB",
    speed: "Ultra Hizli",
    description: "3 saniyede inen, saniyede 60+ token ureten en hafif model"
  },
  {
    id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
    name: "Hermes 2 Pro 7B (Gelismis)",
    size: "~3.8 GB",
    speed: "Standart",
    description: "Buyuk 7B parametreli derin akil yurutme modeli"
  }
];

// Natural Language Intent Extractor: Instantly executes common browser commands with 100% reliability
export function detectDirectIntent(userText: string): { name: string; arguments: any } | null {
  if (!userText || typeof userText !== 'string') return null;
  const text = userText.trim().toLowerCase();

  const sites: Record<string, string> = {
    'youtube': 'https://youtube.com',
    'google': 'https://google.com',
    'github': 'https://github.com',
    'twitter': 'https://x.com',
    'x': 'https://x.com',
    'reddit': 'https://reddit.com',
    'wikipedia': 'https://wikipedia.org',
    'instagram': 'https://instagram.com',
    'facebook': 'https://facebook.com',
    'amazon': 'https://amazon.com',
    'netflix': 'https://netflix.com',
    'spotify': 'https://spotify.com',
    'trendyol': 'https://trendyol.com',
    'hepsiburada': 'https://hepsiburada.com',
    'ekşi': 'https://eksisozluk.com',
    'eksisozluk': 'https://eksisozluk.com',
    'haberler': 'https://news.google.com'
  };

  for (const [siteKey, siteUrl] of Object.entries(sites)) {
    const patterns = [
      new RegExp(`^${siteKey}(\\s*(aç|git|e git|a git|'a git|'e git|'a gir|'e gir|gir|ac))?$`, 'i'),
      new RegExp(`^(open|go to|visit|launch)\\s+${siteKey}$`, 'i'),
      new RegExp(`^${siteKey}\\.com(\\s*(aç|ac))?$`, 'i')
    ];
    for (const pat of patterns) {
      if (pat.test(text)) {
        return { name: 'navigate_to_url', arguments: { url: siteUrl } };
      }
    }
  }

  // Direct URL pattern: "https://..." or "domain.com"
  if (/^https?:\/\/[^\s]+$/i.test(text) || /^[a-z0-9-]+\.(com|org|net|io|dev|app|edu|gov|tr)(\/[^\s]*)?$/i.test(text)) {
    return { name: 'navigate_to_url', arguments: { url: text } };
  }

  // Search queries: "google'da ara: ...", "ara: ...", "hava durumunu ara", "search for ..."
  const searchMatch = text.match(/^(?:google(?:'da)?\s+)?(?:ara|search for|search|search google for|bana ara)\s*[:\s]\s*(.+)$/i) ||
                      text.match(/^(.+?)\s+(?:nedir|nerede|kaç|hakkında bilgi ver|ara|fiyatları)$/i);
  if (searchMatch && searchMatch[1] && searchMatch[1].length > 2 && !searchMatch[1].startsWith('yeni sekme') && !searchMatch[1].startsWith('sayfa')) {
    return { name: 'navigate_to_url', arguments: { url: searchMatch[1].trim() } };
  }

  // Tab management
  if (/^(yeni sekme|yeni sekme aç|yeni sekme ac|yeni sekme oluştur|open new tab|new tab|create tab)$/i.test(text)) {
    return { name: 'manage_tabs', arguments: { action: 'create' } };
  }
  if (/^(sekmeyi kapat|bu sekmeyi kapat|close tab|close current tab)$/i.test(text)) {
    return { name: 'manage_tabs', arguments: { action: 'close' } };
  }

  // Page reading & summary
  if (/^(sayfayı oku|sayfayi oku|bu sayfayı oku|sayfada ne var|sayfayı özetle|read page|read this page|summarize page)$/i.test(text)) {
    return { name: 'read_page_content', arguments: {} };
  }

  // Scrolling
  if (/^(aşağı kaydır|asagi kaydir|aşağı in|sayfayı aşağı kaydır|scroll down)$/i.test(text)) {
    return { name: 'scroll_page', arguments: { direction: 'down' } };
  }
  if (/^(yukarı kaydır|yukari kaydir|yukarı çık|sayfayı yukarı kaydır|scroll up)$/i.test(text)) {
    return { name: 'scroll_page', arguments: { direction: 'up' } };
  }

  // Screenshot
  if (/^(ekran görüntüsü al|ekran goruntusu al|screenshot al|take screenshot|screenshot)$/i.test(text)) {
    return { name: 'take_screenshot', arguments: {} };
  }

  return null;
}

// Helper to parse tool calls from ReAct output across all mini and standard models
export function parseReActAction(text: string): { name: string; arguments: any } | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Look for Action: {"name": "...", "arguments": {...}}
  const actionMatch = text.match(/Action:\s*(\{[\s\S]*?\})(?:\n|$)/i);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1]);
      const name = parsed.name || parsed.tool || parsed.action;
      if (name) {
        return {
          name,
          arguments: parsed.arguments || parsed.parameters || parsed.args || {}
        };
      }
    } catch {}
  }

  // 2. Look for function call syntax: Action: navigate_to_url("https://...") or click_element("1")
  const funcSyntax = text.match(/Action:\s*([a-zA-Z0-9_]+)\(([\s\S]*?)\)/i) ||
                     text.match(/([a-zA-Z0-9_]+)\(([\s\S]*?)\)/i);
  if (funcSyntax) {
    const fn = funcSyntax[1];
    const rawParam = funcSyntax[2].trim();
    const KNOWN_TOOLS = ["navigate_to_url", "read_page_content", "get_page_url", "click_element", "fill_input", "manage_tabs", "scroll_page", "press_key", "take_screenshot", "wait", "get_page_links", "search_history", "save_to_memory", "auto_fill_form"];
    if (KNOWN_TOOLS.includes(fn)) {
      if (fn === 'navigate_to_url') {
        const cleaned = rawParam.replace(/^['"]|['"]$/g, '').trim();
        return { name: fn, arguments: { url: cleaned || 'https://google.com' } };
      }
      if (fn === 'click_element') {
        const cleaned = rawParam.replace(/^['"]|['"]$/g, '').trim();
        return { name: fn, arguments: { ai_id: cleaned } };
      }
      if (fn === 'read_page_content' || fn === 'take_screenshot' || fn === 'get_page_url') {
        return { name: fn, arguments: {} };
      }
      try {
        const parsed = JSON.parse(`{${rawParam}}`);
        return { name: fn, arguments: parsed };
      } catch {}
    }
  }

  // 3. Look for Markdown code block ```json { "name": "...", "arguments": ... } ```
  const jsonCodeMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (jsonCodeMatch) {
    try {
      const parsed = JSON.parse(jsonCodeMatch[1]);
      const name = parsed.name || parsed.tool || parsed.action;
      if (name) {
        return {
          name,
          arguments: parsed.arguments || parsed.parameters || parsed.args || {}
        };
      }
    } catch {}
  }

  // 4. Look for <tool_call>{"name": "...", "arguments": ...}</tool_call>
  const toolCallXml = text.match(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/i);
  if (toolCallXml) {
    try {
      const parsed = JSON.parse(toolCallXml[1]);
      const name = parsed.name || parsed.tool;
      if (name) {
        return {
          name,
          arguments: parsed.arguments || parsed.parameters || parsed.args || {}
        };
      }
    } catch {}
  }

  // 5. Look for direct JSON matching known tool names
  const KNOWN_TOOLS = [
    "navigate_to_url", "read_page_content", "get_page_url", "click_element",
    "fill_input", "manage_tabs", "scroll_page", "press_key", "take_screenshot",
    "wait", "get_page_links", "search_history", "save_to_memory", "auto_fill_form"
  ];
  for (const tool of KNOWN_TOOLS) {
    if (text.includes(`"${tool}"`) || text.includes(`'${tool}'`)) {
      const braceMatch = text.match(/\{[\s\S]*?\}/);
      if (braceMatch) {
        try {
          const parsed = JSON.parse(braceMatch[0]);
          if (parsed.name === tool || parsed.tool === tool || parsed.action === tool) {
            return {
              name: tool,
              arguments: parsed.arguments || parsed.parameters || parsed.args || {}
            };
          }
        } catch {}
      }
    }
  }

  return null;
}

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
  
  // Default: Ultra-Light, High-Performance Mini Model (~800MB download vs 4.5GB 8B)
  private modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; 

  public getModel(): string {
    return this.modelId;
  }

  public setModel(modelId: string) {
    this.modelId = modelId;
    try {
      localStorage.setItem('nova_ai_model', modelId);
    } catch {}
  }

  public getAvailableModels(): AIModelOption[] {
    return AVAILABLE_AI_MODELS;
  }

  private getThemeColor(): string {
    try {
      const stored = localStorage.getItem('user_settings');
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
      if (typeof navigator !== 'undefined' && !(navigator as any).gpu) {
        throw new Error("WebGPU is not supported or hardware acceleration is disabled. Please enable Hardware Acceleration in your system/browser settings.");
      }

      const initProgressCallback: InitProgressCallback = (initProgress) => {
        if (onProgress) {
          onProgress(initProgress.progress * 100, initProgress.text);
        }
      };

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      const worker = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), { type: 'module' });

      try {
        const storedModel = localStorage.getItem('nova_ai_model');
        const validModelIds = AVAILABLE_AI_MODELS.map(m => m.id);
        if (storedModel && validModelIds.includes(storedModel)) {
          this.modelId = storedModel;
        } else {
          this.modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
          localStorage.setItem('nova_ai_model', this.modelId);
        }
      } catch {}

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
        
        try {
          url = new URL(url).href;
        } catch (e) {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }

        this.actionContext.onNavigate(url);
        await new Promise(r => setTimeout(r, 1200));
        
        result = { 
          success: true, 
          url,
          message: "Sayfa basariyla acildi."
        };
      }

      else if (functionName === "read_page_content") {
        let text = '';
        try {
          const raw = await this.actionContext.onExecuteScript(`document.body.innerText.replace(/\\s+/g, ' ').substring(0, 400)`);
          text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        } catch (e) {
          text = 'Sayfa metni alinamadi.';
        }
        result = { success: true, text };
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

    // 1. Direct Instant Intent Execution for browser commands
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userQuery = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';
    const directIntent = detectDirectIntent(userQuery);

    if (directIntent) {
      const funcName = directIntent.name;
      if (onChunk) onChunk(`Islem yapiliyor: ${funcName}...\n\n`);
      
      let friendlyResponse = "Islem tamamlandi.";
      try {
        await this.handleToolCall({
          id: Date.now().toString(),
          type: "function",
          function: { name: funcName, arguments: JSON.stringify(directIntent.arguments) }
        });
        
        if (funcName === 'navigate_to_url') {
          const u = directIntent.arguments.url;
          if (u.includes('youtube.com')) friendlyResponse = "YouTube acildi.";
          else if (u.includes('google.com/search')) friendlyResponse = "Google aramasi yapildi.";
          else friendlyResponse = `${u} sayfasi acildi.`;
        } else if (funcName === 'manage_tabs') {
          if (directIntent.arguments.action === 'create') friendlyResponse = "Yeni sekme acildi.";
          else if (directIntent.arguments.action === 'close') friendlyResponse = "Sekme kapatildi.";
          else friendlyResponse = "Sekme islemi yapildi.";
        } else if (funcName === 'scroll_page') {
          friendlyResponse = directIntent.arguments.direction === 'down' ? "Sayfa asagi kaydirildi." : "Sayfa yukari kaydirildi.";
        } else if (funcName === 'take_screenshot') {
          friendlyResponse = "Ekran goruntusu alindi.";
        } else if (funcName === 'read_page_content') {
          let pageText = '';
          try {
            pageText = await this.actionContext?.onExecuteScript(`document.body.innerText.replace(/\\s+/g, ' ').substring(0, 300)`);
          } catch {}
          friendlyResponse = `Sayfa icerigi:\n\n${pageText || 'Sayfada metin bulunamadi.'}`;
        }
      } catch (e: any) {
        friendlyResponse = `Islem basarisiz: ${e.message || String(e)}`;
      }

      if (onChunk) {
        onChunk(friendlyResponse);
      }

      // Return ONLY clean user messages + single clean assistant response
      return [...messages, { role: 'assistant', content: friendlyResponse }];
    }

    // 2. Conversational reasoning & multi-step execution
    const systemInstruction = `You are Nova Browser's AI Assistant. You help the user browse the web and answer questions clearly.
Available Tools:
- navigate_to_url: {"url": "https://..." or "search query"}
- read_page_content: {}
- click_element: {"ai_id": "1"}
- fill_input: {"value": "text", "submit": true}
- manage_tabs: {"action": "create"|"close"}
- scroll_page: {"direction": "up"|"down"}

Rules:
1. If you need a tool, output: Action: {"name": "<tool>", "arguments": { ... }}
2. If answering the user, answer directly and concisely in Turkish or user language. Never use emojis.`;

    const memoryPrompt = aiMemory.getFormattedMemoryPrompt();

    // Internal loop messages (isolated from user-facing conversation)
    let internalMessages: ChatCompletionMessageParam[] = [
      { 
        role: 'system', 
        content: systemInstruction + (memoryPrompt ? `\n\nUser Profile & Memories:\n${memoryPrompt}` : '') 
      },
      ...messages.filter(m => m.role !== 'system')
    ];

    let isDone = false;
    let finalAnswer = '';
    let loopCount = 0;
    const MAX_LOOPS = 4;

    while (!isDone) {
      await new Promise(r => setTimeout(r, 40));
      loopCount++;

      if (loopCount > MAX_LOOPS || this.isInterrupted) {
        finalAnswer = this.isInterrupted ? 'Islem durduruldu.' : 'Islem tamamlandi.';
        break;
      }

      // Sliding window
      let windowedMessages = internalMessages;
      if (internalMessages.length > MAX_HISTORY_MESSAGES) {
        windowedMessages = [
          internalMessages[0],
          ...internalMessages.slice(-MAX_HISTORY_MESSAGES + 1)
        ];
      }

      let responseText = '';
      try {
        const reply = await this.engine.chat.completions.create({
          messages: windowedMessages,
          max_tokens: 350,
          temperature: 0.1,
          stream: false
        });
        responseText = reply.choices[0]?.message?.content || '';
      } catch (e: any) {
        finalAnswer = 'Bir hata olustu. Lutfen tekrar deneyin.';
        break;
      }

      const action = parseReActAction(responseText);
      if (action && action.name) {
        if (onChunk) onChunk(`> Arac calistiriliyor: ${action.name}...\n\n`);
        let toolResult = '';
        try {
          toolResult = await this.handleToolCall({
            id: Date.now().toString(),
            type: 'function',
            function: { name: action.name, arguments: JSON.stringify(action.arguments) }
          });
        } catch (err: any) {
          toolResult = JSON.stringify({ error: err.message || String(err) });
        }

        internalMessages.push({
          role: 'assistant',
          content: `Action: {"name": "${action.name}", "arguments": ${JSON.stringify(action.arguments)}}`
        } as ChatCompletionMessageParam);

        internalMessages.push({
          role: 'user',
          content: `Observation: ${toolResult}\nLutfen kullaniciya sonucu kisa ve oz acikla. Kesinlikle emoji kullanma.`
        } as ChatCompletionMessageParam);
      } else {
        isDone = true;
        finalAnswer = responseText.replace(/Action:\s*\{[\s\S]*?\}/gi, '').trim();
        if (!finalAnswer) {
          finalAnswer = 'Islemleri tamamladim.';
        }
      }
    }

    if (onChunk && finalAnswer) {
      const words = finalAnswer.split(' ');
      for (let i = 0; i < words.length; i++) {
        onChunk((i === 0 ? '' : ' ') + words[i]);
        await new Promise(r => setTimeout(r, 12));
      }
    }

    // Return ONLY the original messages + single clean assistant response
    return [...messages, { role: 'assistant', content: finalAnswer }];
  }

  // A fast, lightweight method exclusively for background tasks like Link Preview (No tools, no orchestrator)
  public async summarize(text: string, pageTitle?: string): Promise<string> {
    if (!this.engine) throw new Error("Engine not initialized");
    
    try {
      const reply = await this.engine.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a fast, concise web summarization AI. Summarize the provided webpage content in 2 to 3 complete, coherent sentences in the same language as the original text (e.g. Turkish if the text is in Turkish, English if English). Never cut off sentences mid-way; always finish every sentence completely with proper punctuation. Do NOT include conversational filler like 'Here is the summary:' or 'Özet:'." 
          },
          { 
            role: "user", 
            content: `${pageTitle ? `Title: ${pageTitle}\n\n` : ''}Content:\n${text.substring(0, 2500)}` 
          }
        ],
        temperature: 0.2,
        max_tokens: 220
      });
      
      let result = reply.choices[0].message.content || "";
      result = result.trim();

      // Ensure clean ending at a sentence boundary if truncated
      if (result && !/[.!?]$/.test(result)) {
        const lastPeriod = Math.max(result.lastIndexOf('.'), result.lastIndexOf('!'), result.lastIndexOf('?'));
        if (lastPeriod > 40) {
          result = result.substring(0, lastPeriod + 1);
        } else {
          result += '.';
        }
      }
      
      return result;
    } catch (e) {
      console.warn('[aiAgent] Summarize failed, falling back to clean text extraction:', e);
      throw e;
    }
  }
}

export const aiAgent = new AIAgent();

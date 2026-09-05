import type { MLCEngine, InitProgressCallback, ChatCompletionMessageParam, ChatCompletionContentPart } from "@mlc-ai/web-llm";
import { aiMemory } from "./aiMemory";
import { tts } from "./tts";
import { orchestrator } from "./agentOrchestrator";
import { generateId } from "../utils/idGenerator";

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

/** Optional user attachments for a chat turn (FIX 7). */
export interface ChatAttachments {
  /** Image data URLs (e.g. "data:image/png;base64,..."). Requires a vision model. */
  images?: string[];
  /** Text files already read to strings by the caller. */
  files?: { name: string; text: string }[];
}

/** Typed error thrown by the agent so the UI can map codes to friendly copy. */
export class AiError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

/** Lifecycle status of the agent, broadcast via aiAgent.onStatus() (FIX 6). */
export type AgentStatus = {
  state: 'idle' | 'loading_model' | 'thinking' | 'acting' | 'waiting_approval' | 'error' | 'parked';
  detail?: string;
};

type AgentStatusCallback = (status: AgentStatus) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback model used when no (or a stale) model id is stored locally. */
export const DEFAULT_AI_MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

/** Max tokens per agent-loop generation (headroom for constrained Action JSON). */
const AGENT_MAX_TOKENS = 700;
/** Max tokens for background summarization. */
const SUMMARIZE_MAX_TOKENS = 300;
/** Total char budget across ALL attached text files on >=4096-token models (B2). */
const ATTACH_TOTAL_BUDGET_CHARS_LARGE = 8000;
/** Total char budget across ALL attached text files on small-window models (B2). */
const ATTACH_TOTAL_BUDGET_CHARS_SMALL = 3000;
/** Approximate chars per token used to estimate the attachment context cost (B2). */
const ATTACH_CHARS_PER_TOKEN = 4;
/** Minimum tokens that must remain for the conversation after attachments (B2). */
const MIN_CONVERSATION_TOKEN_RESERVE = 1200;

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

/**
 * Escapes a string for safe interpolation into a JavaScript template literal.
 * JSON.stringify() escapes for JSON but not for JS template literals (backticks, ${}).
 * This ensures the string can be safely embedded in a backtick-delimited template.
 */
function escapeForJSTemplate(str: string): string {
  return str
    .replace(/\\/g, '\\\\')      // Backslash must be first
    .replace(/`/g, '\\`')        // Escape backticks
    .replace(/\$/g, '\\$')       // Escape $ (prevents ${} interpolation)
    .replace(/\n/g, '\\n')       // Escape newlines
    .replace(/\r/g, '\\r')       // Escape carriage returns
    .replace(/\t/g, '\\t');      // Escape tabs
}

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

/** Outcome of parsing one grammar-constrained agent turn (FIX 1). */
type ConstrainedOutcome =
  | { kind: 'action'; name: string; arguments: any }
  | { kind: 'reply'; text: string }
  | { kind: 'invalid'; reason: string };

export interface AIModelOption {
  id: string;
  name: string;
  size: string;
  speed: string;
  description: string;
  isDefault?: boolean;
  /** True only for multimodal models that accept image content parts. */
  vision?: boolean;
}

// Streamlined model options: recommended general model, vision model, and ultra-light model
export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 3B (Recommended)",
    size: "~1.7 GB",
    speed: "Fast",
    description: "Balanced reasoning, fluent English assistant",
    isDefault: true
  },
  {
    id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
    name: "Phi 3.5 Vision (Multimodal)",
    size: "~2.4 GB",
    speed: "Standard",
    description: "Multimodal model with visual and screenshot analysis",
    vision: true
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B (Ultra Light)",
    size: "~350 MB",
    speed: "Ultra Fast",
    description: "Lowest resource usage, instant download"
  }
];

function isTurkishText(str: string): boolean {
  if (/[ığüşöçİĞÜŞÖÇ]/.test(str)) return true;
  return /\b(merhaba|selam|selamlar|nasılsın|naber|lütfen|teşekkür|tesekkur|sekme|sekmeyi|sayfa|sayfayı|özetle|ozetle|kapat|kaydır|kaydir|gecmis|gecmisi)\b/i.test(str);
}

// Natural Language Intent Extractor: Instantly executes common browser commands and conversational greetings with 100% reliability
export function detectDirectIntent(userText: string): { name: string; arguments: any; directReply?: string; isSummary?: boolean } | null {
  if (!userText || typeof userText !== 'string') return null;
  const text = userText.trim();
  const lower = text.toLowerCase();
  const isTr = isTurkishText(text);

  // Normalize Turkish characters and common typos
  const normalized = lower
    .replace(/\bknalını\b|\bknalini\b|\bknalı\b|\bknali\b/g, 'kanalını')
    .replace(/\byotube\b|\byoutbe\b|\byutube\b/g, 'youtube')
    .replace(/\bgogle\b|\bgoole\b/g, 'google')
    .replace(/\bhackernews\b|\bhacker\s+news\b|\bhn\b/g, 'hackernews');

  // 0. Conversational greetings and friendly chat (Zero-latency instant reply, zero tool hallucination)
  if (/^(selam|selamlar|slm|merhaba|merhabalar|mrb|hey|hi|hello|günaydın|gunaydin|iyi günler|iyi gunler|iyi akşamlar|iyi aksamlar|nasılsın|nasilsin|naber|ne haber|nbr|sa|as)$/i.test(normalized)) {
    return {
      name: 'direct_chat',
      arguments: {},
      directReply: isTr
        ? "Merhaba! Ben Nova Browser yapay zeka asistanıyım. Web'de gezinebilir, Google/YouTube'da arama yapabilir, sayfaları özetleyebilir veya sekmeleri yönetebilirim. Sana nasıl yardımcı olabilirim?"
        : "Hello! I am Nova Browser's AI assistant. I can browse the web, search Google/YouTube, summarize pages, or manage tabs. How can I help you today?"
    };
  }

  // 0b. Identity and capabilities queries
  if (/^(sen kimsin|kimsin|sen nesin|ne yapabilirsin|neler yapabilirsin|yardım|yardim|help|about|who are you|what can you do)$/i.test(normalized)) {
    return {
      name: 'direct_chat',
      arguments: {},
      directReply: isTr
        ? "Nova Browser AI asistanı olarak sekmeleri ve pencereleri yönetebilir, Google/YouTube/GitHub aramaları yapabilir, sayfaları okuyup özetleyebilir ve formları doldurabilirim."
        : "As Nova Browser's AI assistant, I can manage tabs and workspaces, search Google/YouTube/GitHub, read and summarize pages, and assist with browser actions."
    };
  }

  // 0c. Gratitude & pleasantries
  if (/^(teşekkürler|tesekkurler|teşekkür ederim|tesekkur ederim|sağol|sagol|eyvallah|tşk|tsk|thanks|thank you)$/i.test(normalized)) {
    return {
      name: 'direct_chat',
      arguments: {},
      directReply: isTr
        ? "Rica ederim! Başka yardımcı olabileceğim bir işlem var mı?"
        : "You're welcome! Let me know if there's anything else you'd like me to do."
    };
  }

  // 1. YouTube Compound Searches (e.g. "youtube aç ve enes batur kanalını aç", "youtube'da tarkan aç", "youtube enes batur izle")
  const ytCompoundMatch = 
    normalized.match(/^youtube(?:'da|\s+da)?\s+(?:aç|ac|a git|'a git|git)?\s*(?:ve|,)?\s*(?:bana\s+)?(.+?)\s*(?:kanalını\s*aç|kanalini\s*ac|kanalını|kanalini|videosunu\s*aç|videosunu\s*ac|videosu|videosunu|şarkısını\s*aç|şarkısını|izle|dinle|ara|aç|ac)?$/i) ||
    normalized.match(/^youtube\s+(.+)$/i);

  if (ytCompoundMatch && ytCompoundMatch[1]) {
    let query = ytCompoundMatch[1]
      .replace(/^(aç|ac|ve|git)\s+/gi, '')
      .replace(/\s+(kanalını|kanalini|knalını|knalini|videosunu|şarkısını|şarkısı|izle|dinle|aç|ac|ara)$/gi, '')
      .replace(/\s+(ve|ile)\s+/gi, ' ')
      .trim();

    if (query && query !== 'aç' && query !== 'ac' && query !== 'git' && query !== 'youtube') {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return { 
        name: 'navigate_to_url', 
        arguments: { url: searchUrl },
        directReply: isTr ? `YouTube'da "${query}" arandı.` : `Searched for "${query}" on YouTube.`
      };
    }
  }

  // 2. GitHub Search or Direct Repository (e.g. "github unitybtw/nova-browser aç", "github'da react ara")
  const githubRepoMatch = normalized.match(/^github(?:'da|\s+da)?\s+(?:aç|ac|a git|git)?\s*([a-z0-9_.-]+\/[a-z0-9_.-]+)(?:\s*(?:reposunu|reposu|projesini)?\s*(?:aç|ac|git)?)?$/i);
  if (githubRepoMatch && githubRepoMatch[1]) {
    const repo = githubRepoMatch[1];
    return {
      name: 'navigate_to_url',
      arguments: { url: `https://github.com/${repo}` },
      directReply: isTr ? `GitHub'da ${repo} deposu açıldı.` : `Opened GitHub repository ${repo}.`
    };
  }

  const githubSearchMatch = normalized.match(/^github(?:'da|\s+da)?\s+(?:aç|ac|a git|git)?\s*(?:ve|,)?\s*(?:bana\s+)?(.+?)\s*(?:ara|bul|aç|ac)?$/i);
  if (githubSearchMatch && githubSearchMatch[1]) {
    let query = githubSearchMatch[1].replace(/^(aç|ac|ve|git)\s+/gi, '').replace(/\s+(ara|bul|aç|ac)$/gi, '').trim();
    if (query && query !== 'github' && query !== 'aç' && query !== 'ac') {
      return {
        name: 'navigate_to_url',
        arguments: { url: `https://github.com/search?q=${encodeURIComponent(query)}` },
        directReply: isTr ? `GitHub'da "${query}" arandı.` : `Searched for "${query}" on GitHub.`
      };
    }
  }

  // 3. DuckDuckGo Search (e.g. "duckduckgo'da webgpu ara", "duckduckgo webgpu benchmarks")
  const ddgMatch = normalized.match(/^(?:duckduckgo|ddg)(?:'da|\s+da)?\s+(?:aç|ac|a git|git)?\s*(?:ve|,)?\s*(?:bana\s+)?(.+?)\s*(?:ara|bul|aç|ac)?$/i);
  if (ddgMatch && ddgMatch[1]) {
    let query = ddgMatch[1].replace(/^(aç|ac|ve|git)\s+/gi, '').replace(/\s+(ara|bul|aç|ac)$/gi, '').trim();
    if (query && query !== 'duckduckgo' && query !== 'ddg' && query !== 'aç') {
      return {
        name: 'navigate_to_url',
        arguments: { url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` },
        directReply: isTr ? `DuckDuckGo'da "${query}" arandı.` : `Searched for "${query}" on DuckDuckGo.`
      };
    }
  }

  // 4. Wikipedia Search (e.g. "wikipedia'da web browser ara", "wikipedia electron framework")
  const wikiMatch = normalized.match(/^wikipedia(?:'da|\s+da)?\s+(?:aç|ac|a git|git)?\s*(?:ve|,)?\s*(?:bana\s+)?(.+?)\s*(?:ara|bul|maddesini\s*aç|aç|ac)?$/i);
  if (wikiMatch && wikiMatch[1]) {
    let query = wikiMatch[1].replace(/^(aç|ac|ve|git)\s+/gi, '').replace(/\s+(ara|bul|aç|ac|maddesini)$/gi, '').trim();
    if (query && query !== 'wikipedia' && query !== 'aç') {
      return {
        name: 'navigate_to_url',
        arguments: { url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}` },
        directReply: isTr ? `Wikipedia'da "${query}" arandı.` : `Searched for "${query}" on Wikipedia.`
      };
    }
  }

  // 5. Google Search Compound (e.g. "google'da hava durumu ara", "google aç ve hava durumu ara", "istanbul hava durumu ara")
  const googleCompoundMatch = 
    normalized.match(/^google(?:'da|\s+da)?\s+(?:aç|ac|a git|'a git|git)?\s*(?:ve|,)?\s*(?:bana\s+)?(.+?)\s*(?:ara|bul|bak|aç|ac)?$/i) ||
    normalized.match(/^(?:google'da\s+ara|ara|search for|search|bana ara)\s*[:\s]\s*(.+)$/i) ||
    normalized.match(/^(.+?)\s+(?:nedir|nerede|kaç|hakkında bilgi ver|fiyatları)$/i);

  if (googleCompoundMatch && googleCompoundMatch[1]) {
    let query = googleCompoundMatch[1]
      .replace(/^(aç|ac|ve|git)\s+/gi, '')
      .replace(/\s+(ara|bul|bak|aç|ac)$/gi, '')
      .trim();
    if (query && query !== 'aç' && query !== 'ac' && query !== 'git' && query !== 'google' && !query.startsWith('yeni sekme') && !query.startsWith('sayfa')) {
      return {
        name: 'navigate_to_url',
        arguments: { url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
        directReply: isTr ? `Google'da "${query}" arandı.` : `Searched for "${query}" on Google.`
      };
    }
  }

  // 6. Direct site opening
  const sites: Record<string, string> = {
    'hackernews': 'https://news.ycombinator.com',
    'youtube': 'https://youtube.com',
    'google': 'https://google.com',
    'github': 'https://github.com',
    'twitter': 'https://x.com',
    'x': 'https://x.com',
    'reddit': 'https://reddit.com',
    'wikipedia': 'https://wikipedia.org',
    'duckduckgo': 'https://duckduckgo.com',
    'stackoverflow': 'https://stackoverflow.com',
    'arxiv': 'https://arxiv.org',
    'medium': 'https://medium.com',
    'linkedin': 'https://linkedin.com',
    'instagram': 'https://instagram.com',
    'facebook': 'https://facebook.com',
    'amazon': 'https://amazon.com',
    'netflix': 'https://netflix.com',
    'spotify': 'https://spotify.com',
    'trendyol': 'https://trendyol.com',
    'hepsiburada': 'https://hepsiburada.com',
    'ekşi': 'https://eksisozluk.com',
    'eksisozluk': 'https://eksisozluk.com',
    'haberler': 'https://news.google.com',
    'chatgpt': 'https://chatgpt.com'
  };

  for (const [siteKey, siteUrl] of Object.entries(sites)) {
    const patterns = [
      new RegExp(`^${siteKey}(\\s*(aç|git|e git|a git|'a git|'e git|'a gir|'e gir|gir|ac))?$`, 'i'),
      new RegExp(`^(open|go to|visit|launch)\\s+${siteKey}$`, 'i'),
      new RegExp(`^${siteKey}\\.com(\\s*(aç|ac))?$`, 'i'),
      new RegExp(`^${siteKey}\\.org(\\s*(aç|ac))?$`, 'i')
    ];
    for (const pat of patterns) {
      if (pat.test(normalized)) {
        const displayName = siteKey === 'hackernews' ? 'Hacker News' : siteKey.charAt(0).toUpperCase() + siteKey.slice(1);
        return { 
          name: 'navigate_to_url', 
          arguments: { url: siteUrl },
          directReply: isTr ? `${displayName} açıldı.` : `Opened ${displayName}.`
        };
      }
    }
  }

  // 7. Direct URL
  if (/^https?:\/\/[^\s]+$/i.test(text) || /^[a-z0-9-]+\.(com|org|net|io|dev|app|edu|gov|tr)(\/[^\s]*)?$/i.test(text)) {
    const u = text.startsWith('http') ? text : 'https://' + text;
    return { name: 'navigate_to_url', arguments: { url: u }, directReply: isTr ? `${u} açıldı.` : `Opened ${u}.` };
  }

  // 8. History & Bookmarks Search (e.g. "geçmişte github ara", "search history for react")
  const historySearchMatch = normalized.match(/^(?:geçmişte|geçmişimde|gecmiste|gecmisimde|yer\s*imlerimde|history|bookmarks)\s+(?:ara|bul|search\s*for|search)?\s*[:\s]?\s*(.+)$/i);
  if (historySearchMatch && historySearchMatch[1]) {
    const q = historySearchMatch[1]
      .replace(/^(?:ara|bul|search\s*for|search)\s+/gi, '')
      .replace(/\s+(?:ara|bul|search|araştır|arastir)$/gi, '')
      .trim();
    if (q) {
      return {
        name: 'search_history',
        arguments: { query: q },
        directReply: isTr ? `Geçmişte ve yer imlerinde "${q}" arandı.` : `Searched history for "${q}".`
      };
    }
  }

  // 9. Tab management
  if (/^(yeni sekme|yeni sekme aç|yeni sekme ac|yeni sekme oluştur|open new tab|new tab|create tab)$/i.test(normalized)) {
    return { name: 'manage_tabs', arguments: { action: 'create' }, directReply: isTr ? "Yeni sekme açıldı." : "New tab created." };
  }
  if (/^(sekmeyi kapat|bu sekmeyi kapat|close tab|close current tab)$/i.test(normalized)) {
    return { name: 'manage_tabs', arguments: { action: 'close' }, directReply: isTr ? "Sekme kapatıldı." : "Tab closed." };
  }
  if (/^(sekmeleri listele|açık sekmeler|acik sekmeler|açık sekmeleri göster|list tabs|show tabs)$/i.test(normalized)) {
    return { name: 'manage_tabs', arguments: { action: 'list' } };
  }

  // 10. Page reading and summarization
  if (/^(sayfayı oku|sayfayi oku|bu sayfayı oku|sayfada ne var|sayfayı özetle|sayfayi ozetle|özetle|ozetle|bu sayfayı özetle|read page|read this page|summarize page|summarize this page)$/i.test(normalized)) {
    const isSummary = /özet|ozet|summar/i.test(normalized);
    return { name: 'read_page_content', arguments: {}, isSummary };
  }

  // 11. Scrolling
  if (/^(en alta kaydır|en alta in|sayfanın sonuna in|scroll to bottom)$/i.test(normalized)) {
    return { name: 'scroll_page', arguments: { direction: 'bottom' }, directReply: isTr ? "Sayfanın en altına kaydırıldı." : "Scrolled to page bottom." };
  }
  if (/^(en üste kaydır|en uste kaydir|sayfanın başına dön|scroll to top)$/i.test(normalized)) {
    return { name: 'scroll_page', arguments: { direction: 'top' }, directReply: isTr ? "Sayfanın en başına kaydırıldı." : "Scrolled to page top." };
  }
  if (/^(aşağı kaydır|asagi kaydir|aşağı in|sayfayı aşağı kaydır|scroll down)$/i.test(normalized)) {
    return { name: 'scroll_page', arguments: { direction: 'down' }, directReply: isTr ? "Sayfa aşağı kaydırıldı." : "Page scrolled down." };
  }
  if (/^(yukarı kaydır|yukari kaydir|yukarı çık|sayfayı yukarı kaydır|scroll up)$/i.test(normalized)) {
    return { name: 'scroll_page', arguments: { direction: 'up' }, directReply: isTr ? "Sayfa yukarı kaydırıldı." : "Page scrolled up." };
  }

  // 12. Screenshot
  if (/^(ekran görüntüsü al|ekran goruntusu al|screenshot al|take screenshot|screenshot)$/i.test(normalized)) {
    return { name: 'take_screenshot', arguments: {}, directReply: isTr ? "Ekran görüntüsü alındı." : "Screenshot captured." };
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
  private worker: Worker | null = null;
  private actionContext: AIActionContext | null = null;
  private isInitializing = false;
  private isInterrupted = false;
  private operationGeneration = 0;

  private isOperationActive(generation: number): boolean {
    return generation === this.operationGeneration && !this.isInterrupted;
  }

  // --- Status emitter (FIX 6) ---
  private statusSubscribers: Set<AgentStatusCallback> = new Set();

  /** Subscribe to agent lifecycle status. Returns an unsubscribe function. */
  public onStatus(cb: AgentStatusCallback): () => void {
    this.statusSubscribers.add(cb);
    cb(this.currentStatus());
    return () => {
      this.statusSubscribers.delete(cb);
    };
  }

  private lastStatus: AgentStatus = { state: 'idle' };

  private currentStatus(): AgentStatus {
    return { ...this.lastStatus };
  }

  private emitStatus(state: AgentStatus['state'], detail?: string) {
    this.lastStatus = detail !== undefined ? { state, detail } : { state };
    this.statusSubscribers.forEach(cb => {
      try {
        cb({ ...this.lastStatus });
      } catch (e) {
        // A faulty subscriber must never break the agent loop
        console.error('[AI Agent] Status subscriber threw:', e);
      }
    });
  }

  public interrupt() {
    this.isInterrupted = true;
    this.operationGeneration++;
    if (this.engine) {
      try {
        this.engine.interruptGenerate();
      } catch (e) {
        console.warn('[AI Agent] interruptGenerate error:', e);
      }
    }
    this.emitStatus('idle');
  }

  // Default: balanced 3B model (see DEFAULT_AI_MODEL_ID / AVAILABLE_AI_MODELS)
  private modelId = DEFAULT_AI_MODEL_ID;

  public getModel(): string {
    return this.modelId;
  }

  /**
   * Resolves a stored model id against the current catalog. Stale ids from
   * older versions (e.g. removed entries) gracefully fall back to the default.
   */
  private resolveModelId(stored: string | null | undefined): string {
    if (stored && AVAILABLE_AI_MODELS.some(m => m.id === stored)) {
      return stored;
    }
    return DEFAULT_AI_MODEL_ID;
  }

  /** Whether the currently loaded model accepts image content parts. */
  public currentModelSupportsVision(): boolean {
    return !!AVAILABLE_AI_MODELS.find(m => m.id === this.modelId)?.vision;
  }

  /**
   * Per-model context window. The tiny 0.5B model keeps its small budget;
   * everything else gets room for grounded page content + tool JSON.
   */
  private getContextWindowSizeForModel(modelId: string): number {
    return modelId.startsWith('Qwen2.5-0.5B') ? 2048 : 4096;
  }

  /**
   * Context window of the loaded engine, captured at init (B3). Budgets for
   * page reads and attachments are scaled from this so small-window models
   * (e.g. Qwen2.5-0.5B @ 2048) don't overflow before generation starts.
   */
  private ctxWindowSize = 4096;

  /** Page text budget returned by read_page_content, scaled to the window (B3). */
  private getPageContentMaxChars(): number {
    return this.ctxWindowSize <= 2048 ? 800 : 3500;
  }

  /** Page text budget for the instant direct-intent reply path (B3). */
  private getDirectIntentPageChars(): number {
    return this.ctxWindowSize <= 2048 ? 400 : 1500;
  }

  private idleParkTimer: any = null;

  public isEngineLoaded(): boolean {
    return !!this.engine;
  }

  public getVramEstimate(): number {
    if (!this.engine) return 0;
    if (this.modelId.includes('3B')) return 2200;
    if (this.modelId.includes('Vision')) return 3100;
    if (this.modelId.includes('0.5B')) return 450;
    return 2000;
  }

  public getAutoParkTimeoutMinutes(): number {
    try {
      const stored = localStorage.getItem('nova_ai_park_timeout');
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val;
      }
    } catch {}
    return 3; // Default: 3 minutes of idle inactivity
  }

  public setAutoParkTimeoutMinutes(mins: number): void {
    try {
      localStorage.setItem('nova_ai_park_timeout', String(mins));
    } catch {}
    this.resetIdleParkTimer();
  }

  public resetIdleParkTimer(): void {
    if (this.idleParkTimer) {
      clearTimeout(this.idleParkTimer);
      this.idleParkTimer = null;
    }
    if (!this.engine) return;
    const mins = this.getAutoParkTimeoutMinutes();
    if (mins <= 0) return; // 0 = Never park (always resident)

    this.idleParkTimer = setTimeout(() => {
      if (this.lastStatus.state === 'idle' && !this.isInitializing) {
        this.parkModel().catch(err => console.warn('[AI Agent] Auto-park error:', err));
      }
    }, mins * 60 * 1000);
  }

  /**
   * Explicitly park resident model: unloads from VRAM to release GPU command buffers
   * and memory bandwidth back to Chromium compositor, eliminating scroll jank.
   */
  public async parkModel(): Promise<void> {
    if (!this.engine && !this.worker) return;
    console.log('[AI Agent] Parking resident model to reclaim VRAM for GPU compositor.');
    if (this.idleParkTimer) {
      clearTimeout(this.idleParkTimer);
      this.idleParkTimer = null;
    }
    await this.unload();
    this.emitStatus('parked', 'Model parked (VRAM freed)');
  }

  /**
   * Cooperative micro-yield to browser event loop and compositor.
   * Guarantees regular 16ms V-Sync paint windows for smooth 60/120 FPS scrolling.
   */
  public async yieldToCompositor(): Promise<void> {
    if (typeof window !== 'undefined' && 'scheduler' in window && typeof (window as any).scheduler?.yield === 'function') {
      try {
        await (window as any).scheduler.yield();
        return;
      } catch {}
    }
    await new Promise(r => setTimeout(r, 12));
  }

  /**
   * Fully unloads the Web-LLM engine and terminates the background Web Worker.
   * Reclaims GPU VRAM and eliminates dangling worker threads.
   */
  public async unload(): Promise<void> {
    if (this.idleParkTimer) {
      clearTimeout(this.idleParkTimer);
      this.idleParkTimer = null;
    }
    this.operationGeneration++;
    this.isInterrupted = true;
    if (this.engine) {
      try {
        await this.engine.unload?.();
      } catch (e) {
        console.warn('[AI Agent] Engine unload warning:', e);
      }
      this.engine = null;
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {
        console.warn('[AI Agent] Worker termination error:', e);
      }
      this.worker = null;
    }
    this.isInitializing = false;
    this.emitStatus('idle');
  }

  public async setModel(modelId: string) {
    if (this.modelId === modelId) return;
    this.modelId = modelId;
    try {
      localStorage.setItem('nova_ai_model', modelId);
    } catch {}
    await this.unload();
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
        description: "Fills form inputs on the active web page using stored memory. NEVER call this for casual chat, questions, or greetings. ONLY call this when the user explicitly asks to fill out a form on the current web page.",
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

  // -----------------------------------------------------------------------
  // Grammar-constrained decoding (FIX 1) + system prompt generation (FIX 2)
  // -----------------------------------------------------------------------

  /** Cached tool-name enum + JSON schema string, invalidated on model reload. */
  private toolCallSchemaString: string | null = null;
  private toolNameEnum: string[] = [];
  private constrainedUnsupported = false;

  /**
   * Builds the response_format schema used to grammar-constrain every agent
   * turn: the model MUST emit one JSON object with either a `tool` call
   * (enum built dynamically from the real tools array, so all tools stay
   * reachable) or a plain `reply` — never free-form ReAct prose.
   */
  private getToolCallSchemaString(): string {
    const toolNames = this.tools.map(t => t?.function?.name).filter((n): n is string => typeof n === 'string');
    if (this.toolCallSchemaString === null || this.toolNameEnum.join(',') !== toolNames.join(',')) {
      this.toolNameEnum = toolNames;
      const schema = {
        type: "object",
        properties: {
          tool: { type: "string", enum: toolNames, description: "Name of the tool to call. Mutually exclusive with reply." },
          arguments: { type: "object", description: "Arguments object for the chosen tool. Required when tool is set." },
          reply: { type: "string", description: "Final answer to the user. Mutually exclusive with tool." }
        },
        required: [],
        additionalProperties: false
      };
      this.toolCallSchemaString = JSON.stringify(schema);
    }
    return this.toolCallSchemaString;
  }

  /**
   * Generates the system prompt from the actual tools array so every tool is
   * advertised with a one-line argument summary (no more hardcoded 6-tool list).
   * Kept compact (<400 words) for small models.
   *
   * B3: on <=2048-token windows (e.g. Qwen2.5-0.5B) a COMPACT variant is
   * emitted instead: tool name + required args only, no descriptions — but
   * still the complete tool list, so every tool stays reachable.
   */
  private buildSystemPrompt(): string {
    const compact = this.ctxWindowSize <= 2048;
    const fnList = this.tools
      .map(t => t?.function)
      .filter((fn): fn is { name: string; description?: string; parameters?: any } => !!fn && typeof fn.name === 'string');

    const toolLines = (
      compact
        ? fnList.map(fn => {
            const props: Record<string, any> = fn.parameters?.properties ?? {};
            const required: string[] = Array.isArray(fn.parameters?.required) ? fn.parameters.required : [];
            const args = required.map(key => `${key}:${props[key]?.type ?? 'any'}`).join(', ');
            return `- ${fn.name}${args ? `(${args})` : ''}`;
          })
        : fnList.map(fn => {
            const props: Record<string, any> = fn.parameters?.properties ?? {};
            const required: string[] = Array.isArray(fn.parameters?.required) ? fn.parameters.required : [];
            const args = Object.entries(props).map(([key, prop]: [string, any]) => {
              const req = required.includes(key) ? '' : '?';
              const enumHint = Array.isArray(prop?.enum) ? `:${prop.enum.join('|')}` : '';
              return `${key}${req}:${prop?.type ?? 'any'}${enumHint}`;
            }).join(', ');
            let desc = String(fn.description || '').split('.')[0].trim();
            if (desc.length > 60) desc = desc.substring(0, 57).trimEnd() + '...';
            return `- ${fn.name}: ${desc}.${args ? ` Args: ${args}.` : ''}`;
          })
    ).join('\n');

    return `You are Nova Browser's AI assistant. You control a real browser and answer questions.

TOOLS:
${toolLines}

OUTPUT FORMAT: One JSON object per turn, nothing else.
- To execute a browser tool: {"tool": "<name>", "arguments": {...}}
- To answer or converse: {"reply": "<your response>"}

CRITICAL RULES:
1. GENERAL CHAT & GREETINGS: If the user says hello, asks a general question, thanks you, or chats, DO NOT call any tool! Immediately output {"reply": "<helpful friendly answer>"}.
2. ONLY USE TOOLS FOR EXPLICIT ACTIONS: Only use tools when the user explicitly commands a browser action (e.g. open a site, search something, click an element, read page).
3. NEVER CALL auto_fill_form unless the user explicitly tells you to fill a form on the current web page.
4. LANGUAGE MATCHING: ALWAYS reply in the EXACT SAME language the user is speaking/prompting in. If the user writes in English, reply strictly in English. If the user writes in Turkish, reply in Turkish. If the user writes in Spanish, reply in Spanish, French in French, German in German, etc. Never switch languages unless explicitly requested by the user.
5. STRICT RULE: NEVER USE EMOJIS ANYWHERE. Ground your facts in reality.`;
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
        // Broadcast download progress to status subscribers (FIX 6)
        const pct = Math.round(initProgress.progress * 100);
        this.emitStatus('loading_model', `${pct}% ${initProgress.text}`.trim());
      };

      // Terminate any previous lingering worker before spinning up a new one
      if (this.worker) {
        try {
          this.worker.terminate();
        } catch {}
        this.worker = null;
      }
      if (this.engine) {
        try {
          await this.engine.unload?.();
        } catch {}
        this.engine = null;
      }

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      this.worker = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), { type: 'module' });

      // Resolve stored model against the catalog; stale ids migrate to default
      try {
        const storedModel = localStorage.getItem('nova_ai_model');
        this.modelId = this.resolveModelId(storedModel);
        localStorage.setItem('nova_ai_model', this.modelId);
      } catch {}

      this.engine = await CreateWebWorkerMLCEngine(this.worker, this.modelId, {
        initProgressCallback,
        context_window_size: this.getContextWindowSizeForModel(this.modelId)
      } as any) as any;

      // Budgets (page reads, attachments, system prompt) scale with the
      // loaded model's window (B3).
      this.ctxWindowSize = this.getContextWindowSizeForModel(this.modelId);

      // Schema cache depends on the tools array only, but reset defensively.
      // The constrained-decoding capability is also per runtime/model, so a
      // reload re-tries response_format once before caching the fallback (S1).
      this.toolCallSchemaString = null;
      this.constrainedUnsupported = false;
      this.emitStatus('idle');
      this.resetIdleParkTimer();

    } catch (err: any) {
      console.error("Failed to initialize AI Engine:", err);
      this.engine = null;
      this.emitStatus('error', err?.message || String(err));
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Adaptive post-navigation wait. Replaces the old blind 1200ms sleep: poll
   * the live page through the action context until document.readyState is
   * 'complete' (checked every 150ms, capped at 6s), so already-loaded pages
   * proceed almost immediately while slow ones still get a fair window.
   * A minimum settle delay runs first so the navigation has time to actually
   * start — otherwise the previous document could still report 'complete'.
   * Remains interruptible: bails out as soon as this.isInterrupted flips.
   */
  private async waitForPageLoadSettled(generation?: number): Promise<void> {
    const isActive = () => generation === undefined
      ? !this.isInterrupted
      : this.isOperationActive(generation);
    const POLL_INTERVAL_MS = 150;
    const MAX_WAIT_MS = 6000;
    const MIN_SETTLE_MS = 300;
    // If script execution keeps failing (web dev mode without an Electron
    // webview, or prolonged mid-navigation context destruction), stop polling
    // instead of burning the entire cap.
    const MAX_CONSECUTIVE_ERRORS = 5;

    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    await sleep(MIN_SETTLE_MS);

    const deadline = Date.now() + MAX_WAIT_MS;
    let consecutiveErrors = 0;
    while (Date.now() < deadline) {
      if (!isActive()) return;
      try {
        const readyState = await this.actionContext?.onExecuteScript(`document.readyState`);
        if (readyState === 'complete') return;
        consecutiveErrors = 0;
      } catch (e) {
        // Execution context briefly destroyed during navigation is expected;
        // keep polling unless failures persist.
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  public async handleToolCall(toolCall: any, generation?: number): Promise<string> {
    if (generation !== undefined && !this.isOperationActive(generation)) {
      return JSON.stringify({ error: "Action cancelled." });
    }
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

    // Security: never log tool args — they can carry form field values,
    // search queries and other user-typed data that would leak into terminal
    // logs. Log only the tool name.
    console.log(`[AI Agent] Executing tool: ${functionName}`);

    if (!this.actionContext) {
      return JSON.stringify({ error: "Action context not set. Browser APIs unavailable." });
    }

    // Id of THIS action in the orchestrator queue (S3) — used for status
    // emission and all bookkeeping instead of getQueue() tail inspection.
    let actionId: string | null = null;

    try {
      // Pause execution and ask for user approval before doing the action.
      // Read-only tools are auto-approved inside the orchestrator; all other
      // tools stay 'pending' until the user approves or denies the action card
      // in the AI side panel. On denial, denyAction() has already marked the
      // action 'denied' in the queue.
      const { id: queuedId, done: approvalPromise } = orchestrator.enqueueAction(functionName, args);
      actionId = queuedId;

      // If the orchestrator queued this as 'pending', tell status subscribers
      // the agent is blocked on user approval (FIX 6). Keyed by our own id,
      // not by queue position (S3).
      const queuedAction = orchestrator.getQueue().find(a => a.id === actionId);
      if (queuedAction && queuedAction.state === 'pending') {
        this.emitStatus('waiting_approval', functionName);
      }

      const approved = await approvalPromise;
      if (!approved) {
        return JSON.stringify({ error: "User denied the action." });
      }
      if (generation !== undefined && !this.isOperationActive(generation)) {
        orchestrator.updateActionState(actionId, 'denied');
        return JSON.stringify({ error: "Action cancelled." });
      }

      orchestrator.updateActionState(actionId, 'executing');

      // Broadcast tool execution (FIX 6)
      this.emitStatus('acting', functionName);

      let result: any;

      if (functionName === "navigate_to_url") {
        let url = args.url as string;
        if (!/^https?:\/\//i.test(url) && !url.includes('.')) {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        } else if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }
        
        try {
          url = new URL(url).href;
        } catch (e) {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }

        this.actionContext.onNavigate(url);
        await this.waitForPageLoadSettled(generation);

        result = {
          success: true,
          url,
          message: "Sayfa basariyla acildi."
        };
      }

      else if (functionName === "read_page_content") {
        let text = '';
        try {
          const raw = await this.actionContext.onExecuteScript(`document.body.innerText.replace(/\\s+/g, ' ').substring(0, ${this.getPageContentMaxChars()})`);
          text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        } catch (e) {
          text = 'Sayfa metni alinamadi.';
        }

        // Revive DOM_SCAN_SCRIPT: tag visible interactive elements with
        // data-ai-id (the script sets the attributes itself, which is what
        // makes click_element/fill_input's [data-ai-id="N"] contract work)
        // and append the inventory to the returned content.
        let elementsSection = '';
        try {
          const scanRaw = await this.actionContext.onExecuteScript(DOM_SCAN_SCRIPT);
          let scan: any = scanRaw;
          if (typeof scanRaw === 'string') {
            try { scan = JSON.parse(scanRaw); } catch { scan = null; }
          }
          const items: any[] = Array.isArray(scan?.interactable_elements) ? scan.interactable_elements : [];
          if (items.length > 0) {
            const lines = items.map((el: any) => {
              const typeHint = el.type ? ` type=${el.type}` : '';
              const label = el.text ? ` "${el.text}"` : '';
              return `[ai_id=${el.ai_id}] <${el.tag}${typeHint}>${label}`;
            });
            elementsSection = `\n\nINTERACTIVE_ELEMENTS (use ai_id with click_element/fill_input):\n${lines.join('\n')}`;
          }
        } catch (e) {
          // Element inventory is best-effort; page text alone is still useful
          console.warn('[AI Agent] DOM scan failed:', e);
        }

        result = { success: true, text: text + elementsSection };
      }

      else if (functionName === "get_page_url") {
        const data = await this.actionContext.onExecuteScript(`JSON.stringify({ url: window.location.href, title: document.title });`);
        result = { success: true, ...JSON.parse(data) };
      }

      else if (functionName === "click_element") {
        const { ai_id, fallback_text } = args;
        const colorHex = this.getThemeColor();
        // Escape all user-controlled values for safe JS template literal interpolation
        const safeAiId = escapeForJSTemplate(JSON.stringify(ai_id));
        const safeFallbackText = escapeForJSTemplate(JSON.stringify(fallback_text ?? ''));
        const safeFallbackTextLower = escapeForJSTemplate(JSON.stringify((fallback_text ?? '').toLowerCase()));
        const safeColorHex = escapeForJSTemplate(colorHex);
        const script = `(async () => {
          let el = null;
          if (${safeAiId}) {
            el = document.querySelector('[data-ai-id="' + ${safeAiId} + '"]');
          }
          if (!el && ${safeFallbackText}) {
            const allEls = document.querySelectorAll('a, button, [role="button"], input[type="submit"], label');
            for (const candidate of allEls) {
              if (candidate.textContent?.trim().toLowerCase().includes(${safeFallbackTextLower})) {
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
              const color = '${safeColorHex}';
              
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
          return { error: 'Element not found', tried: { ai_id: ${safeAiId}, fallback_text: ${safeFallbackText} } };
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
        // Escape all user-controlled values for safe JS template literal interpolation
        const safeAiId = escapeForJSTemplate(JSON.stringify(ai_id));
        const safeValue = escapeForJSTemplate(JSON.stringify(value));
        const safeSubmit = escapeForJSTemplate(JSON.stringify(submit ?? false));
        const safeColorHex = escapeForJSTemplate(colorHex);
        const script = `(async () => {
          const el = document.querySelector('[data-ai-id="' + ${safeAiId} + '"]');
          if (!el) return { error: 'Input not found for ID: ' + ${safeAiId} };
          
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 400));
          
          try {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const color = '${safeColorHex}';
            
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
            const textToType = ${safeValue};
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
          
          el.setAttribute('value', ${safeValue});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          if (${safeSubmit}) {
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
        result = { success: true, results, hint: "Here are the top matches from history and bookmarks. If you find the link you need, you can navigate_to_url." };
      }

      else if (functionName === "auto_fill_form") {
        // Fetch inputs from the page (including any tagged data-ai-id so the
        // model can reference elements the same way fill_input expects)
        const script = `(() => {
          return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            id: el.id,
            ai_id: el.getAttribute('data-ai-id')
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
          const failedCommands: { selector: string; reason: string }[] = [];
          for (const cmd of fillCommands) {
            if (cmd.selector && cmd.value) {
              // fill_input resolves elements via [data-ai-id], so map the CSS
              // selector to its tagged ai_id first (tagging on the fly if the
              // element has not been indexed by read_page_content yet).
              // fallbackAfId is CSPRNG (generateId -> crypto.randomUUID) so the
              // in-page script never falls back to predictable Date.now().
              const fallbackAfId = generateId('af');
              const resolveScript = `(() => {
                try {
                  const el = document.querySelector(${JSON.stringify(cmd.selector)});
                  if (!el) return JSON.stringify({ error: 'Element not found for selector: ' + ${JSON.stringify(cmd.selector)} });
                  let aiId = el.getAttribute('data-ai-id');
                  if (!aiId) {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                      aiId = 'af_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
                    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                      aiId = 'af_' + Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
                    } else {
                      aiId = ${JSON.stringify(fallbackAfId)};
                    }
                    el.setAttribute('data-ai-id', aiId);
                  }
                  return JSON.stringify({ ai_id: aiId });
                } catch (e) {
                  return JSON.stringify({ error: 'Invalid selector: ' + ${JSON.stringify(cmd.selector)} });
                }
              })();`;
              const rawResolved = await this.actionContext.onExecuteScript(resolveScript);
              let resolved: any = rawResolved;
              if (typeof resolved === 'string') {
                try { resolved = JSON.parse(resolved); } catch (_) { resolved = null; }
              }

              if (resolved && resolved.ai_id) {
                await this.handleToolCall(
                  { id: generateId('call'), type: "function", function: { name: "fill_input", arguments: JSON.stringify({ ai_id: resolved.ai_id, value: cmd.value }) } },
                  generation
                );
              } else {
                // Surface a clear error instead of silently skipping the field
                failedCommands.push({
                  selector: cmd.selector,
                  reason: resolved?.error || 'Could not resolve element for selector'
                });
              }
            }
          }
          result = {
            success: true,
            filled: fillCommands.length,
            ...(failedCommands.length > 0 ? { failed: failedCommands } : {}),
            hint: "Form was auto-filled."
          };
        } else {
          result = { success: false, hint: "No matching fields found to auto-fill based on memory." };
        }
      }

      else if (functionName === "scroll_page") {
        // Security: direction/amount come from model-generated JSON and are
        // interpolated into a script executed on the page — validate strictly and
        // interpolate ONLY whitelisted values.
        const VALID_SCROLL_DIRECTIONS = ['up', 'down', 'top', 'bottom'];
        const rawDirection = typeof args.direction === 'string' ? args.direction : '';
        if (!VALID_SCROLL_DIRECTIONS.includes(rawDirection)) {
          throw new Error(`Invalid scroll direction: must be one of ${VALID_SCROLL_DIRECTIONS.join(', ')}`);
        }
        const direction: string = rawDirection;
        const parsedAmount = Math.floor(Number(args.amount));
        const amount = Math.min(Math.max(Number.isFinite(parsedAmount) ? parsedAmount : 600, 0), 10000);
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
        // Security: this memory originates from a TOOL, not a direct user
        // request. aiMemory tags it source:'tool', so model-authored
        // 'instruction' entries stay session-only and can never persist into
        // the system prompt of future sessions.
        const memory = aiMemory.addMemory(fact, category || 'fact', true);
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
        result = { success: true, screenshot: base64, screenshotBase64Length: base64.length };
      }

      else if (functionName === "wait") {
        const rawMs = Number(args.ms);
        const safeMs = (!Number.isFinite(rawMs) || rawMs < 0) ? 1000 : Math.min(Math.floor(rawMs), 10000);
        await this.actionContext.onWait(safeMs);
        result = { success: true, waitedMs: safeMs };
      }

      else if (functionName === "get_page_links") {
        const links = await this.actionContext.onGetPageLinks();
        result = { success: true, linksCount: links.length, links };
      }

      else {
        throw new Error(`Unknown function: ${functionName}`);
      }

      if (actionId) {
        orchestrator.updateActionState(actionId, 'completed', result);
      }
      return JSON.stringify(result);

    } catch (err: any) {
      if (actionId) {
        orchestrator.updateActionState(actionId, 'failed', undefined, err.message);
      }
      return JSON.stringify({ error: err.message });
    }
  }

  /**
   * Validates a grammar-constrained JSON turn. The schema guarantees
   * well-formed JSON, but never trust it blindly: check the tool exists in
   * the real tools array and that arguments are an object.
   */
  private validateConstrainedOutput(raw: string): ConstrainedOutcome {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: 'invalid', reason: 'output was not valid JSON' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { kind: 'invalid', reason: 'output was not a JSON object' };
    }
    const toolNames = this.tools.map(t => t?.function?.name).filter((n): n is string => typeof n === 'string');
    if (typeof parsed.tool === 'string' && parsed.tool.length > 0) {
      if (!toolNames.includes(parsed.tool)) {
        return { kind: 'invalid', reason: `unknown tool "${parsed.tool}"` };
      }
      let args = parsed.arguments;
      if (args === undefined || args === null) args = {};
      if (typeof args !== 'object' || Array.isArray(args)) {
        return { kind: 'invalid', reason: '"arguments" must be an object' };
      }
      return { kind: 'action', name: parsed.tool, arguments: args };
    }
    if (typeof parsed.reply === 'string' && parsed.reply.trim().length > 0) {
      return { kind: 'reply', text: parsed.reply.trim() };
    }
    return { kind: 'invalid', reason: 'object must contain either a known "tool" or a non-empty "reply"' };
  }

  /**
   * One agent-loop generation. Prefers grammar-constrained decoding
   * (response_format json_object + schema); if WebLLM rejects response_format
   * on this model/runtime, falls back to the legacy free-text ReAct path.
   */
  private async generateAgentTurn(
    windowedMessages: ChatCompletionMessageParam[],
    generation?: number
  ): Promise<{ text: string; constrained: boolean }> {
    const isActive = () => generation === undefined
      ? !this.isInterrupted
      : this.isOperationActive(generation);
    if (!isActive()) {
      return { text: 'Islem durduruldu.', constrained: false };
    }
    this.emitStatus('thinking');
    await this.yieldToCompositor();
    if (!this.constrainedUnsupported) {
      try {
        const reply = await this.engine!.chat.completions.create({
          messages: windowedMessages,
          temperature: 0.1,
          max_tokens: AGENT_MAX_TOKENS,
          stream: false,
          response_format: { type: "json_object", schema: this.getToolCallSchemaString() }
        } as any);
        await this.yieldToCompositor();
        if (!isActive()) {
          return { text: 'Islem durduruldu.', constrained: false };
        }
        const text = reply.choices[0]?.message?.content || '';
        if (text.trim().length > 0) {
          return { text, constrained: true };
        }
        // Empty constrained output: treat as a soft failure and retry via the
        // legacy path below rather than burning a corrective round-trip.
        console.warn('[AI Agent] Constrained decoding returned empty output; using legacy path.');
      } catch (e) {
        if (!isActive()) {
          return { text: 'Islem durduruldu.', constrained: false };
        }
        console.warn('[AI Agent] Constrained decoding failed; falling back to free-text:', e);
        this.constrainedUnsupported = true;
      }
    }
    if (!isActive()) {
      return { text: 'Islem durduruldu.', constrained: false };
    }
    await this.yieldToCompositor();
    const reply = await this.engine!.chat.completions.create({
      messages: windowedMessages,
      temperature: 0.1,
      max_tokens: AGENT_MAX_TOKENS,
      stream: false
    });
    await this.yieldToCompositor();
    if (!isActive()) {
      return { text: 'Islem durduruldu.', constrained: false };
    }
    return { text: reply.choices[0]?.message?.content || '', constrained: false };
  }

  public async chat(
    messages: ChatCompletionMessageParam[],
    onChunk?: (chunk: string) => void,
    attachments?: ChatAttachments
  ): Promise<ChatCompletionMessageParam[]> {
    if (!this.engine) {
      this.emitStatus('loading_model', 'Waking up parked model...');
      await this.init();
    }
    this.isInterrupted = false;
    const generation = ++this.operationGeneration;

    try {
      // ---------------------------------------------------------------
      // FIX 7: attachment processing
      // ---------------------------------------------------------------
      const MAX_ATTACHED_IMAGES = 4;
      const MAX_IMAGE_CHARS = 5 * 1024 * 1024;
      const images = (attachments?.images ?? [])
        .filter((u): u is string => typeof u === 'string' && u.length > 0 && u.length <= MAX_IMAGE_CHARS)
        .slice(0, MAX_ATTACHED_IMAGES);

      const attachedFiles = (attachments?.files ?? []).filter(f => f && typeof f.name === 'string');
      const maxTotalChars = this.ctxWindowSize <= 2048 ? ATTACH_TOTAL_BUDGET_CHARS_SMALL : ATTACH_TOTAL_BUDGET_CHARS_LARGE;
      let remainingChars = maxTotalChars;
      const fileBlocksList: string[] = [];
      for (const f of attachedFiles) {
        if (remainingChars <= 0) break;
        const textSlice = (f.text || '').substring(0, remainingChars);
        remainingChars -= textSlice.length;
        const safeName = (f.name || 'file').replace(/[<>&"']/g, '_');
        fileBlocksList.push(`<attached_file name="${safeName}">\n${textSlice}\n</attached_file>`);
      }
      const fileBlocks = fileBlocksList.join('\n\n');
      const hasAttachments = images.length > 0 || fileBlocks.length > 0;

      // Images require a vision-capable model — fail fast with a typed,
      // UI-mappable error instead of silently ignoring the images.
      if (images.length > 0 && !this.currentModelSupportsVision()) {
        const msg = 'Selected model does not support visual content analysis. To analyze images, please download and select "Phi 3.5 Vision (Multimodal)" in Settings.';
        this.emitStatus('error', msg);
        throw new AiError('vision_required', msg);
      }

      // Build augmented copies for inference only; the returned history keeps
      // the caller's original messages (no multi-MB data URLs persisted).
      let augmentedMessages = messages;
      if (hasAttachments) {
        let lastUserIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') { lastUserIdx = i; break; }
        }
        augmentedMessages = messages.map((m, idx) => {
          if (idx !== lastUserIdx) return m;
          const baseText = typeof m.content === 'string' ? m.content : '';
          const textWithFiles = fileBlocks ? `${baseText}\n\n${fileBlocks}` : baseText;
          if (images.length > 0) {
            const parts: ChatCompletionContentPart[] = [
              { type: 'text', text: textWithFiles },
              ...images.map(url => ({ type: 'image_url' as const, image_url: { url } }))
            ];
            return { role: 'user', content: parts } as ChatCompletionMessageParam;
          }
          return { ...m, content: textWithFiles } as ChatCompletionMessageParam;
        });
      }

      // ---------------------------------------------------------------
      // 1. Direct Instant Intent Execution for browser commands.
      //    Skipped entirely when attachments are present: attachments imply
      //    free-form intent that the regex bypass cannot represent.
      // ---------------------------------------------------------------
      const lastUserMsg = [...augmentedMessages].reverse().find(m => m.role === 'user');
      const userQuery = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';
      if (userQuery) {
        aiMemory.extractAndSaveUserFacts(userQuery);
      }
      const directIntent = hasAttachments ? null : detectDirectIntent(userQuery);

      if (directIntent) {
        const funcName = directIntent.name;

        // Direct conversational responses (greetings, identity, capabilities, thanks) bypass tool execution completely
        if (funcName === 'direct_chat' || !funcName) {
          const directReply = directIntent.directReply || "Hello! How can I help you today?";
          if (onChunk) onChunk(directReply);
          return [...messages, { role: 'assistant', content: directReply }];
        }

        if (onChunk) onChunk(`Executing action: ${funcName}...\n\n`);

        let friendlyResponse = "Action completed.";
        try {
          const toolResult = await this.handleToolCall({
            id: generateId('call'),
            type: "function",
            function: { name: funcName, arguments: JSON.stringify(directIntent.arguments) }
          }, generation);
          let parsedToolResult: any = toolResult;
          try {
            parsedToolResult = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
          } catch {}
          if (parsedToolResult?.error) {
            friendlyResponse = parsedToolResult.error === 'Action cancelled.'
              ? 'İşlem durduruldu.'
              : `İşlem tamamlanamadı: ${parsedToolResult.error}`;
          } else {
            const isTr = isTurkishText(userQuery);
          if (directIntent.directReply && funcName !== 'search_history' && funcName !== 'manage_tabs' && funcName !== 'read_page_content') {
            friendlyResponse = directIntent.directReply;
          } else if (funcName === 'search_history') {
            const results = Array.isArray(parsedToolResult?.results) ? parsedToolResult.results : [];
            if (results.length === 0) {
              friendlyResponse = isTr ? 'Geçmişte veya yer imlerinde eşleşen sonuç bulunamadı.' : 'No matching results found in history or bookmarks.';
            } else {
              const items = results.slice(0, 6).map((r: any) => `- [${r.title || r.url}](${r.url})`).join('\n');
              friendlyResponse = (isTr ? 'Bulunan geçmiş ve yer imi sonuçları:\n\n' : 'Matching history and bookmarks:\n\n') + items;
            }
          } else if (funcName === 'manage_tabs') {
            if (directIntent.arguments.action === 'list') {
              const tabs = Array.isArray(parsedToolResult?.tabs) ? parsedToolResult.tabs : [];
              if (tabs.length === 0) {
                friendlyResponse = isTr ? 'Açık sekme bulunamadı.' : 'No open tabs found.';
              } else {
                const items = tabs.map((t: any, i: number) => `${i + 1}. [${t.title || t.url}](${t.url})`).join('\n');
                friendlyResponse = (isTr ? 'Açık sekmeler:\n\n' : 'Open tabs:\n\n') + items;
              }
            } else if (directIntent.arguments.action === 'create') {
              friendlyResponse = isTr ? 'Yeni sekme oluşturuldu.' : 'New tab created.';
            } else if (directIntent.arguments.action === 'close') {
              friendlyResponse = isTr ? 'Sekme kapatıldı.' : 'Tab closed.';
            } else {
              friendlyResponse = isTr ? 'Sekme işlemi tamamlandı.' : 'Tab action completed.';
            }
          } else if (funcName === 'navigate_to_url') {
            const u = directIntent.arguments.url;
            if (u.includes('youtube.com/results?search_query=')) {
              const q = decodeURIComponent(u.split('search_query=')[1] || '');
              friendlyResponse = isTr ? `YouTube'da "${q}" arandı.` : `Searched for "${q}" on YouTube.`;
            } else if (u.includes('youtube.com')) {
              friendlyResponse = isTr ? "YouTube açıldı." : "YouTube opened.";
            } else if (u.includes('google.com/search')) {
              const q = decodeURIComponent(u.split('q=')[1]?.split('&')[0] || '');
              friendlyResponse = isTr ? `Google'da "${q}" arandı.` : `Searched for "${q}" on Google.`;
            } else if (u.includes('duckduckgo.com/?q=')) {
              const q = decodeURIComponent(u.split('q=')[1]?.split('&')[0] || '');
              friendlyResponse = isTr ? `DuckDuckGo'da "${q}" arandı.` : `Searched for "${q}" on DuckDuckGo.`;
            } else if (u.includes('wikipedia.org/wiki/Special:Search?search=')) {
              const q = decodeURIComponent(u.split('search=')[1]?.split('&')[0] || '');
              friendlyResponse = isTr ? `Wikipedia'da "${q}" arandı.` : `Searched for "${q}" on Wikipedia.`;
            } else {
              friendlyResponse = isTr ? `${u} açıldı.` : `Opened ${u}.`;
            }
          } else if (funcName === 'scroll_page') {
            const dir = directIntent.arguments.direction;
            if (dir === 'bottom') friendlyResponse = isTr ? "Sayfanın en altına kaydırıldı." : "Scrolled to bottom.";
            else if (dir === 'top') friendlyResponse = isTr ? "Sayfanın en başına kaydırıldı." : "Scrolled to top.";
            else friendlyResponse = dir === 'down' ? (isTr ? "Sayfa aşağı kaydırıldı." : "Page scrolled down.") : (isTr ? "Sayfa yukarı kaydırıldı." : "Page scrolled up.");
          } else if (funcName === 'take_screenshot') {
            friendlyResponse = isTr ? "Ekran görüntüsü alındı." : "Screenshot captured.";
          } else if (funcName === 'read_page_content') {
            let pageText = '';
            try {
              pageText = await this.actionContext?.onExecuteScript(`document.body.innerText.replace(/\\s+/g, ' ').substring(0, ${this.getDirectIntentPageChars()})`) || '';
            } catch {}

            if (!pageText.trim()) {
              friendlyResponse = isTr ? 'Sayfada okunabilecek metin bulunamadı.' : 'No readable text found on the page.';
            } else if (directIntent.isSummary && this.engine) {
              try {
                this.emitStatus('thinking');
                const summaryPrompt = isTr
                  ? `Aşağıdaki web sayfası içeriğini 3-4 maddede Türkçe olarak net, öz ve anlaşılır şekilde özetle:\n\n${pageText}`
                  : `Provide a concise 3-4 bullet executive summary with key takeaways from the following web page:\n\n${pageText}`;
                
                const completion = await this.engine.chat.completions.create({
                  messages: [{ role: 'user', content: summaryPrompt }],
                  temperature: 0.2,
                  max_tokens: SUMMARIZE_MAX_TOKENS,
                  stream: false
                });
                friendlyResponse = completion.choices[0]?.message?.content || pageText.substring(0, 400);
              } catch {
                friendlyResponse = (isTr ? 'Sayfa Özeti:\n\n' : 'Page Summary:\n\n') + pageText.substring(0, 500) + '...';
              }
            } else {
              friendlyResponse = (isTr ? 'Sayfa İçeriği:\n\n' : 'Page Content:\n\n') + pageText.substring(0, 600) + (pageText.length > 600 ? '...' : '');
            }
          }
        }
      } catch (e: any) {
          friendlyResponse = `Islem basarisiz: ${e.message || String(e)}`;
          this.emitStatus('error', friendlyResponse);
        }

        if (onChunk) {
          onChunk(friendlyResponse);
        }

        // Record completed task summary in persistent task history
        if (funcName !== 'direct_chat' && !friendlyResponse.startsWith('Islem basarisiz')) {
          const taskSummary = userQuery.length > 60 ? userQuery.substring(0, 60) + '...' : userQuery;
          aiMemory.addTaskSummary(taskSummary);
        }

        // Return ONLY clean user messages + single clean assistant response
        return [...messages, { role: 'assistant', content: friendlyResponse }];
      }

      // ---------------------------------------------------------------
      // 2. Conversational reasoning & multi-step execution
      // ---------------------------------------------------------------
      const systemInstruction = this.buildSystemPrompt();
      const memoryPrompt = aiMemory.getFormattedMemoryPrompt();

      // Internal loop messages (isolated from user-facing conversation)
      let internalMessages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemInstruction + (memoryPrompt ? `\n\nUser Profile & Memories:\n${memoryPrompt}` : '')
        },
        ...augmentedMessages.filter(m => m.role !== 'system')
      ];

      let isDone = false;
      let finalAnswer = '';
      let loopCount = 0;
      const MAX_LOOPS = 4;
      // Honest-failure bookkeeping: never claim success when nothing ran.
      let executedAnyTool = false;
      const executedToolSignatures: string[] = [];
      const isTr = isTurkishText(userQuery);
      const NO_VALID_OUTPUT_MSG = isTr
        ? 'Üzgünüm, bu isteği işleyemedim. Lütfen tekrar deneyin.'
        : 'Sorry, I could not process this request. Please try again.';
      const LOOP_EXHAUSTED_MSG = isTr
        ? 'İşlem adımları çalıştırıldı ancak sonuç özetlenemedi.'
        : 'The requested actions were performed, but the summary could not be completed.';

      while (!isDone) {
        await this.yieldToCompositor();
        loopCount++;

        if (!this.isOperationActive(generation)) {
          finalAnswer = isTr ? 'İşlem durduruldu.' : 'Operation cancelled.';
          break;
        }
        if (loopCount > MAX_LOOPS) {
          finalAnswer = executedAnyTool ? LOOP_EXHAUSTED_MSG : NO_VALID_OUTPUT_MSG;
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

        let turn: { text: string; constrained: boolean };
        try {
          turn = await this.generateAgentTurn(windowedMessages, generation);
        } catch (e: any) {
          finalAnswer = 'An error occurred. Please try again.';
          this.emitStatus('error', e?.message || String(e));
          break;
        }

        // Shared tool-execution block for both decoding paths
        const executeTool = async (name: string, args: any, assistantEcho: string): Promise<void> => {
          const sig = `${name}:${JSON.stringify(args || {})}`;
          if (executedToolSignatures.includes(sig)) {
            console.warn(`[AI Agent] Repeated tool call detected: ${sig}. Forcing final answer.`);
            internalMessages.push({ role: 'assistant', content: assistantEcho } as ChatCompletionMessageParam);
            internalMessages.push({
              role: 'user',
              content: 'Observation: This action was already executed. Please provide the final response to the user in {"reply": "..."} format in the same language as their query without calling more tools.'
            } as ChatCompletionMessageParam);
            return;
          }
          executedToolSignatures.push(sig);

          // Guard against hallucinated auto_fill_form on general chat
          if (name === 'auto_fill_form') {
            const hasFormIntent = /(form|doldur|kayıt|giris|input|fill)/i.test(userQuery);
            if (!hasFormIntent) {
              console.warn('[AI Agent] auto_fill_form hallucinated on general conversation; prompting reply.');
              internalMessages.push({ role: 'assistant', content: assistantEcho } as ChatCompletionMessageParam);
              internalMessages.push({
                role: 'user',
                content: 'Observation: No active form filling was requested on the page. Please reply directly to the user\'s message in {"reply": "..."} format in the same language as their query.'
              } as ChatCompletionMessageParam);
              return;
            }
          }

          if (onChunk) onChunk(isTr ? `> Araç çalıştırılıyor: ${name}...\n\n` : `> Executing action: ${name}...\n\n`);
          let toolResult = '';
          try {
            toolResult = await this.handleToolCall({
              id: generateId('call'),
              type: 'function',
              function: { name, arguments: JSON.stringify(args) }
            }, generation);
          } catch (err: any) {
            toolResult = JSON.stringify({ error: err.message || String(err) });
          }
          executedAnyTool = true;

          internalMessages.push({ role: 'assistant', content: assistantEcho } as ChatCompletionMessageParam);
          internalMessages.push({
            role: 'user',
            content: `Observation: ${toolResult}\nPlease explain this result directly to the user in {"reply": "..."} format in the same language as their query without calling any more tools.`
          } as ChatCompletionMessageParam);
        };

        if (turn.constrained) {
          // FIX 1: grammar-constrained path — guaranteed-well-formed JSON,
          // still validated defensively before acting.
          const outcome = this.validateConstrainedOutput(turn.text);
          if (outcome.kind === 'action') {
            await executeTool(
              outcome.name,
              outcome.arguments,
              JSON.stringify({ tool: outcome.name, arguments: outcome.arguments })
            );
            continue;
          }
          if (outcome.kind === 'reply') {
            isDone = true;
            finalAnswer = outcome.text;
            break;
          }
          // Invalid > one corrective retry instead of fake success
          if (loopCount >= MAX_LOOPS) {
            finalAnswer = executedAnyTool ? LOOP_EXHAUSTED_MSG : NO_VALID_OUTPUT_MSG;
            break;
          }
          internalMessages.push({ role: 'assistant', content: turn.text } as ChatCompletionMessageParam);
          internalMessages.push({
            role: 'user',
            content: `Invalid tool call: ${outcome.reason}. Respond again with valid JSON.`
          } as ChatCompletionMessageParam);
          continue;
        }

        // Legacy free-text fallback (models/runtimes without response_format)
        const action = parseReActAction(turn.text);
        if (action && action.name) {
          await executeTool(
            action.name,
            action.arguments,
            `Action: {"name": "${action.name}", "arguments": ${JSON.stringify(action.arguments)}}`
          );
          continue;
        }
        const cleanedReply = turn.text.replace(/Action:\s*\{[\s\S]*?\}/gi, '').trim();
        if (cleanedReply) {
          isDone = true;
          finalAnswer = cleanedReply;
          break;
        }
        // Neither action nor reply — honest failure, never canned success
        if (loopCount >= MAX_LOOPS) {
          finalAnswer = executedAnyTool ? LOOP_EXHAUSTED_MSG : NO_VALID_OUTPUT_MSG;
          break;
        }
        internalMessages.push({ role: 'assistant', content: turn.text } as ChatCompletionMessageParam);
        internalMessages.push({
          role: 'user',
          content: 'Invalid tool call: no recognizable action or reply. Respond again with valid JSON.'
        } as ChatCompletionMessageParam);
      }

      if (onChunk && finalAnswer) {
        const words = finalAnswer.split(' ');
        for (let i = 0; i < words.length; i++) {
          onChunk((i === 0 ? '' : ' ') + words[i]);
          await new Promise(r => setTimeout(r, 12));
        }
      }

      // Record task summary in persistent task history
      if (userQuery && userQuery.trim() && finalAnswer && !finalAnswer.includes('error occurred') && !finalAnswer.includes('Islem durduruldu')) {
        const taskSummary = userQuery.length > 60 ? userQuery.substring(0, 60) + '...' : userQuery;
        aiMemory.addTaskSummary(taskSummary);
      }

      // Return ONLY the original messages + single clean assistant response
      return [...messages, { role: 'assistant', content: finalAnswer }];
    } finally {
      // The agent loop has ended (normally or via thrown error): go idle —
      // unless an error was just emitted. Overwriting 'error' with 'idle'
      // here would make the error pill unreachable in the UI (B1), so an
      // error stays sticky; the next chat()/init() call clears it naturally
      // via its first thinking/loading_model emission.
      if (this.lastStatus.state !== 'error') {
        this.emitStatus('idle');
      }
      this.resetIdleParkTimer();
    }
  }

  // A fast, lightweight method exclusively for background tasks like Link Preview (No tools, no orchestrator)
  public async summarize(text: string, pageTitle?: string): Promise<string> {
    if (!this.engine) {
      this.emitStatus('loading_model', 'Waking up parked model...');
      await this.init();
    }
    
    try {
      const reply = await this.engine!.chat.completions.create({
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
        max_tokens: SUMMARIZE_MAX_TOKENS
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
    } finally {
      this.resetIdleParkTimer();
    }
  }
}

export const aiAgent = new AIAgent();

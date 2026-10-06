import { useEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from 'react';
import type { Bookmark, HistoryItem, Tab, UserSettings } from '../types/browser';
import { aiAgent } from '../services/aiAgent';
import { orchestrator } from '../services/agentOrchestrator';
// The agent boundary uses the strict destination policy, not the general
// navigation one: agent-supplied URLs are untrusted, and the general predicate
// deliberately permits loopback/private hosts for real user navigation.
import { isSafeAgentNavigationUrl } from '../utils/safeNavigation';

/**
 * Full agent-boundary check: the synchronous renderer policy plus a
 * main-process DNS resolution.
 *
 * `isSafeAgentNavigationUrl` cannot tell whether a public hostname resolves to
 * a private address, so without the second step an attacker-controlled domain
 * (or a rebind between the check and the connect) could aim the agent at
 * 127.0.0.1 or 169.254.169.254 and then read the response back through
 * browser_read_page. When the bridge runs outside Electron there is no main
 * process to ask, so network automation fails closed. This DNS preflight is
 * not connection pinning; it does not prove the address Chromium connected to.
 */
async function agentNavigationAllowed(url: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isSafeAgentNavigationUrl(url)) return { ok: false, reason: 'destination is not a public address' };
  // The synchronous policy already validates internal renderer routes. They
  // have no network host; sending them to the HTTP-only DNS guard rejects them.
  const protocol = new URL(url).protocol;
  if (protocol !== 'http:' && protocol !== 'https:') return { ok: true };
  const api = (window as any).electronAPI;
  if (!api?.checkAgentNavigationHost) return { ok: false, reason: 'host authorization is unavailable' };
  try {
    const verdict = await api.checkAgentNavigationHost(url);
    if (!verdict?.allowed) return { ok: false, reason: verdict?.reason || 'destination failed the host check' };
    return { ok: true };
  } catch (err: any) {
    // Fail closed: an unreachable main process must not become a bypass.
    return { ok: false, reason: `host check failed (${err?.message || 'unknown error'})` };
  }
}
import { searchHistoryAndBookmarks, SearchableItem } from '../utils/searchHistoryBookmarks';

export interface UseBrowserAgentBridgeOptions {
  activeTabId: string | null;
  tabs: Tab[];
  history: HistoryItem[];
  bookmarks: Bookmark[];
  settingsRef: RefObject<UserSettings>;
  activeWorkspaceIdRef: RefObject<string>;
  setActiveWorkspaceId: (workspaceId: string) => void;
  setActiveTabId: (tabId: string) => void;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  handleNavigate: (url: string, explicitTabId?: string) => void;
  handleNewTab: (url?: string | any, sourceTabId?: string, opts?: { reuseBlank?: boolean }) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleSelectTab: (id: string) => void;
}

/**
 * AI Agent Action Context & MCP Action Bridge over IPC.
 * Configures browser control capabilities for aiAgent and handles
 * incoming MCP tool execution requests from the Electron main process.
 */
export function useBrowserAgentBridge({
  activeTabId,
  tabs,
  history,
  bookmarks,
  settingsRef,
  activeWorkspaceIdRef,
  setActiveWorkspaceId,
  setActiveTabId,
  setTabs,
  handleNavigate,
  handleNewTab,
  handleCloseTab,
  handleSelectTab,
}: UseBrowserAgentBridgeOptions): void {
  // Latest-data & latest-handler refs: let the MCP/AI-context effect below keep
  // a stable [] dependency list while still reading fresh values at call time.
  const browserDataRef = useRef({ activeTabId, tabs, history, bookmarks });
  browserDataRef.current = { activeTabId, tabs, history, bookmarks };
  const mcpHandlersRef = useRef({ handleNavigate, handleNewTab, handleCloseTab, handleSelectTab });
  mcpHandlersRef.current = { handleNavigate, handleNewTab, handleCloseTab, handleSelectTab };
  const activeWaitTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const activeWaitResolversRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    // Bind authorization to the mounted guest and its navigation lifetime.
    // URL equality alone misses reloads and A -> B -> A while approval waits.
    const documentVersions = new WeakMap<object, { version: number }>();
    const guestListeners = new WeakMap<object, () => void>();
    const observeGuest = (guest: any) => {
      if (!guest || documentVersions.has(guest)) return;
      const state = { version: 0 };
      documentVersions.set(guest, state);
      const changed = (event: any) => { if (event?.isMainFrame !== false) state.version++; };
      for (const name of ['did-start-navigation', 'did-navigate-in-page', 'render-process-gone', 'destroyed']) {
        guest.addEventListener?.(name, changed);
      }
      guestListeners.set(guest, () => {
        for (const name of ['did-start-navigation', 'did-navigate-in-page', 'render-process-gone', 'destroyed']) {
          guest.removeEventListener?.(name, changed);
        }
      });
    };
    const currentGuest = () => Array.from(document.querySelectorAll('webview')).find(
      (guest: any) => guest.getAttribute?.('data-tab-id') === browserDataRef.current.activeTabId
    ) as any;
    const captureTarget = () => {
      const tabId = browserDataRef.current.activeTabId;
      const guest = currentGuest();
      observeGuest(guest);
      let url = '';
      try { url = guest ? guest.getURL() : (browserDataRef.current.tabs.find(t => t.id === tabId)?.url || ''); } catch (_) {}
      return { tabId, guest, url, version: guest ? documentVersions.get(guest)?.version : undefined };
    };
    const targetIsCurrent = (target: ReturnType<typeof captureTarget>) => {
      if (browserDataRef.current.activeTabId !== target.tabId || currentGuest() !== target.guest) return false;
      if (!target.guest) return (browserDataRef.current.tabs.find(t => t.id === target.tabId)?.url || '') === target.url;
      try {
        return target.guest.getURL() === target.url && documentVersions.get(target.guest)?.version === target.version &&
          !target.guest.isDestroyed?.() && !target.guest.isLoading?.();
      } catch (_) { return false; }
    };
    const guardedGuest = (canExecute = () => true) => {
      const target = captureTarget();
      if (!target.guest) return null;
      const assertCurrent = () => {
        if (!canExecute() || !targetIsCurrent(target)) throw new Error('Agent action blocked: target document changed or action expired.');
      };
      const authorize = async () => {
        assertCurrent();
        // Renderer routes/extensions may be opened, but their privileged content
        // is never available to website automation.
        if (!/^https?:/.test(target.url)) throw new Error('Agent content access blocked: target is not a public website.');
        const gate = await agentNavigationAllowed(target.url);
        assertCurrent();
        if (!gate.ok) throw new Error(`Agent content access blocked for security (${gate.reason}).`);
      };
      return new Proxy(target.guest, {
        get(guest, key) {
          const original = guest[key];
          if (typeof original !== 'function') return original;
          if (!['executeJavaScript', 'capturePage', 'sendInputEvent', 'goBack', 'goForward', 'reload', 'setZoomLevel'].includes(String(key))) {
            return original.bind(guest);
          }
          return async (...args: any[]) => {
            await authorize();
            if (key === 'executeJavaScript') {
              // The check runs in the same guest task as the operation, closing
              // the cross-origin navigation gap between IPC dispatch and use.
              args[0] = `if (window.location.href !== ${JSON.stringify(target.url)}) { throw new Error('Agent action blocked: target document changed.'); }\n${args[0]}`;
            }
            const result = await original.apply(guest, args);
            // History/reload intentionally replace the document and return no
            // sensitive content. Reads and captures must retain their binding.
            if (key === 'executeJavaScript' || key === 'capturePage') assertCurrent();
            return result;
          };
        }
      });
    };

    // 1. Define executeMcpAction as a local function (not exposed on window)
    // VULN-11 FIX: Removed global window assignment to prevent any webpage or extension
    // from invoking browser control APIs. The MCP server in the main process can invoke
    // this function via webContents.executeJavaScript() instead of relying on a global.
    const executeMcpAction = async (toolName: string, args: any, canExecute = () => true) => {
      if (!toolName || typeof toolName !== 'string') {
        return "Error: Invalid toolName parameter";
      }
      const safeArgs = (args && typeof args === 'object') ? args : {};
      const { activeTabId, tabs } = browserDataRef.current;
      const activeWebview = guardedGuest(canExecute);

      switch (toolName) {
        case 'browser_navigate':
          if (!safeArgs.url || typeof safeArgs.url !== 'string') return "Error: Missing or invalid 'url' parameter";
          // Agent boundary: the URL here comes from an MCP client or LLM, and
          // page content the agent reads can author it. So the stricter
          // destination policy applies on top of the general one — loopback,
          // link-local (169.254.169.254 metadata), RFC1918 and their IPv6
          // equivalents are refused, so a prompt injection cannot point the
          // agent at an internal service and then read it back out through
          // browser_read_page. See safeNavigation.ts for what this does and
          // does not cover.
          const gate = await agentNavigationAllowed(safeArgs.url);
          if (!canExecute()) return "Error: MCP action was cancelled or expired.";
          if (!gate.ok) {
            return `Error: Navigation to this destination is blocked for security (${gate.reason}).`;
          }
          mcpHandlersRef.current.handleNavigate(safeArgs.url, activeTabId || undefined);
          return `Navigated to ${safeArgs.url}`;

        case 'browser_read_page':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                let text = (document.body?.innerText || document.documentElement?.innerText || '');
                const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(Boolean);
                return JSON.stringify({ text: text.substring(0, 10000), links: links.slice(0, 50) });
              })();
            `);
          }
          return "Error: No active webview available.";

        case 'browser_click':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            const result = await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    el.click();
                    return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  }
                  return { success: false, error: "Element not found with selector: " + ${JSON.stringify(safeArgs.selector)} };
                } catch (err) {
                  return { success: false, error: "Invalid selector or DOM error: " + String(err) };
                }
              })();
            `);
            if (result && result.success) {
              const bounds = activeWebview.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('ai-cursor', {
                detail: { x: bounds.left + result.x, y: bounds.top + result.y, action: 'click' }
              }));
              return "Successfully clicked element.";
            }
            return result.error || "Error";
          }
          return "Error: No active webview.";

        case 'browser_type':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          const textToType = typeof safeArgs.text === 'string' ? safeArgs.text : String(safeArgs.text ?? '');
          if (activeWebview && activeWebview.executeJavaScript) {
            const result = await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    el.value = ${JSON.stringify(textToType)};
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    if (${safeArgs.pressEnter === true ? 'true' : 'false'}) {
                      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
                      el.dispatchEvent(enterEvent);
                    }
                    return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  }
                  return { success: false, error: "Element not found with selector: " + ${JSON.stringify(safeArgs.selector)} };
                } catch (err) {
                  return { success: false, error: "Invalid selector or DOM error: " + String(err) };
                }
              })();
            `);
            if (result && result.success) {
              const bounds = activeWebview.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('ai-cursor', {
                detail: { x: bounds.left + result.x, y: bounds.top + result.y, action: 'type', text: textToType }
              }));
              return "Successfully typed text.";
            }
            return result.error || "Error";
          }
          return "Error: No active webview.";

        case 'browser_run_js':
          return "Error: browser_run_js has been removed for security reasons (VULN-01).";

        case 'browser_list_tabs':
          return JSON.stringify(tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isActive: t.id === activeTabId })));

        case 'browser_switch_tab': {
          if (!safeArgs.tabId || typeof safeArgs.tabId !== 'string') return "Error: Missing or invalid 'tabId' parameter";
          const target = tabs.find(t => t.id === safeArgs.tabId);
          if (target) {
            const targetWs = target.workspaceId || 'default';
            if (targetWs !== (activeWorkspaceIdRef.current || 'default')) {
              setActiveWorkspaceId(targetWs);
            }
            setActiveTabId(safeArgs.tabId);
            return `Switched to tab ${safeArgs.tabId}`;
          }
          return `Error: Tab ${safeArgs.tabId} not found.`;
        }

        case 'browser_close_tab':
          if (!safeArgs.tabId || typeof safeArgs.tabId !== 'string') return "Error: Missing or invalid 'tabId' parameter";
          mcpHandlersRef.current.handleCloseTab(safeArgs.tabId);
          return `Closed tab ${safeArgs.tabId}`;

        case 'browser_screenshot':
          if (activeWebview && activeWebview.capturePage) {
            const image = await activeWebview.capturePage();
            return image.toDataURL();
          }
          return "Error: Could not take screenshot.";

        case 'browser_scroll': {
          const direction = String(safeArgs.direction || 'down');
          const cleanAmount = Math.min(10000, Math.max(0, Math.abs(Number(safeArgs.amount) || 500)));
          if (activeWebview && activeWebview.executeJavaScript) {
            if (direction === 'up') await activeWebview.executeJavaScript(`window.scrollBy(0, -${cleanAmount})`);
            else if (direction === 'down') await activeWebview.executeJavaScript(`window.scrollBy(0, ${cleanAmount})`);
            else if (direction === 'top') await activeWebview.executeJavaScript(`window.scrollTo(0, 0)`);
            else if (direction === 'bottom') await activeWebview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
            return `Scrolled ${direction}`;
          }
          return "Error: No active webview.";
        }

        case 'browser_new_tab': {
          const newUrl = safeArgs.url || 'nova://newtab';
          // Same agent boundary as browser_navigate: a new tab at an internal
          // address is just as reachable by browser_read_page.
          const gate = await agentNavigationAllowed(newUrl);
          if (!canExecute()) return "Error: MCP action was cancelled or expired.";
          if (!gate.ok) {
            return `Error: Navigation blocked for unsafe destination (${gate.reason}): ${newUrl}`;
          }
          mcpHandlersRef.current.handleNewTab(newUrl, undefined, { reuseBlank: false });
          return `Opened new tab: ${newUrl}`;
        }

        case 'browser_go_back':
          if (activeWebview && activeWebview.goBack) {
            await activeWebview.goBack();
            return "Navigated back";
          }
          return "Error: No active webview.";

        case 'browser_go_forward':
          if (activeWebview && activeWebview.goForward) {
            await activeWebview.goForward();
            return "Navigated forward";
          }
          return "Error: No active webview.";

        case 'browser_reload':
          if (activeWebview && activeWebview.reload) {
            await activeWebview.reload();
            return "Page reloaded";
          }
          return "Error: No active webview.";

        case 'browser_get_url': {
          const activeTab = tabs.find(t => t.id === activeTabId);
          return activeTab?.url || "Error: Could not get URL";
        }

        case 'browser_hover':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) {
                    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    return "Hovered over element";
                  }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_focus':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { el.focus(); return "Focused element"; }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_select_option':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el && el.tagName === 'SELECT') {
                    el.value = ${JSON.stringify(safeArgs.value)};
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return "Selected option: " + ${JSON.stringify(safeArgs.value)};
                  }
                  return "Error: Select element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_press_key':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const selector = ${JSON.stringify(safeArgs.selector || null)};
                  let target = null;
                  if (selector) {
                    try {
                      target = document.querySelector(selector);
                      if (target && target.focus) target.focus();
                    } catch (_) {}
                  }
                  if (!target) target = document.activeElement || document.body;
                  const key = ${JSON.stringify(safeArgs.key)};
                  const keyMap = { 'Enter': 13, 'Tab': 9, 'Escape': 27, 'Space': 32, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39, 'Backspace': 8, 'Delete': 46 };
                  const keyCode = keyMap[key] || (key && key.charCodeAt ? key.charCodeAt(0) : 0);
                  ['keydown','keypress','keyup'].forEach(t => {
                    target.dispatchEvent(new KeyboardEvent(t, { key, keyCode, which: keyCode, bubbles: true }));
                  });
                  return "Pressed key: " + key;
                } catch (err) {
                  return "Error: Failed to press key: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_get_element_text':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) return el.innerText || el.textContent || '';
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_scroll_to_element':
          if (typeof safeArgs.selector !== 'string' || !safeArgs.selector) return "Error: Missing or invalid 'selector' parameter";
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return "Scrolled to element"; }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_zoom':
          if (activeWebview && activeWebview.setZoomLevel) {
            const zoomLevel = Number(safeArgs.level) || 0;
            await activeWebview.setZoomLevel(zoomLevel);
            return `Zoom level set to ${zoomLevel}`;
          }
          return "Error: No active webview.";

        case 'browser_mute_tab': {
          const mute = Boolean(safeArgs.mute);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isMuted: mute } : t));
          return mute ? "Tab muted" : "Tab unmuted";
        }

        case 'browser_pin_tab': {
          const pin = Boolean(safeArgs.pin);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isPinned: pin } : t));
          return pin ? "Tab pinned" : "Tab unpinned";
        }

        case 'browser_duplicate_tab': {
          const currentTab = tabs.find(t => t.id === activeTabId);
          if (currentTab) {
            const gate = await agentNavigationAllowed(currentTab.url);
            if (!canExecute() || !gate.ok) return "Error: Duplicate navigation blocked for security or changed target.";
            mcpHandlersRef.current.handleNewTab(currentTab.url);
            return `Duplicated tab: ${currentTab.url}`;
          }
          return "Error: No active tab to duplicate";
        }

        default:
          return `Error: Unknown tool ${toolName}`;
      }
    };

    // 2. Original aiAgent context setup
    aiAgent.setActionContext({
      onNavigate: async (url: string) => {
        // Same untrusted-input boundary as the MCP tools above: these URLs come
        // from LLM output, which page content can influence.
        const target = captureTarget();
        const gate = await agentNavigationAllowed(url);
        if (!gate.ok || !targetIsCurrent(target)) {
          console.warn(`AI agent navigation refused (${gate.reason}):`, url);
          return;
        }
        mcpHandlersRef.current.handleNavigate(url, target.tabId || undefined);
      },
      onExecuteScript: async (script: string) => {
        const webview = guardedGuest();
        if (webview && webview.executeJavaScript) {
          const timeoutMs = 3500;
          let timer: any = null;
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Script execution timed out')), timeoutMs);
          });
          const scriptPromise = webview.executeJavaScript(script);
          if (typeof scriptPromise?.catch === 'function') {
            scriptPromise.catch(() => {});
          }
          try {
            const res = await Promise.race([
              scriptPromise,
              timeoutPromise
            ]);
            return res;
          } catch (e) {
            console.warn("AI execution error or timeout:", e);
            throw e;
          } finally {
            if (timer) clearTimeout(timer);
          }
        }

        const iframe = document.querySelector(`iframe[data-tab-id="${browserDataRef.current.activeTabId}"]`) as HTMLIFrameElement;
        if (iframe) {
          console.warn("AI scripts cannot be executed in iframes due to cross-origin security. Please run the app in Electron.");
          return "Error: Cannot read page content in web development mode. Please run the desktop app.";
        }

        throw new Error("No active webview or iframe found");
      },
      onCreateTab: async (url: string) => {
        const gate = await agentNavigationAllowed(url);
        if (!gate.ok) {
          console.warn(`AI agent tab creation refused (${gate.reason}):`, url);
          return;
        }
        mcpHandlersRef.current.handleNewTab(url);
      },
      onCloseTab: (id?: string) => {
        const targetId = id || browserDataRef.current.activeTabId;
        if (targetId) mcpHandlersRef.current.handleCloseTab(targetId);
      },
      onSwitchTab: (id: string) => mcpHandlersRef.current.handleSelectTab(id),
      onGetAllTabs: () => browserDataRef.current.tabs.map(t => ({ id: t.id, title: t.title, url: t.url })),
      onScrollPage: async (direction, amount) => {
        const webview = guardedGuest();
        const cleanAmount = Math.min(10000, Math.max(0, Math.abs(Number(amount) || 500)));
        if (webview && webview.executeJavaScript) {
          try {
            if (direction === 'up') await webview.executeJavaScript(`window.scrollBy(0, -${cleanAmount})`);
            else if (direction === 'down') await webview.executeJavaScript(`window.scrollBy(0, ${cleanAmount})`);
            else if (direction === 'top') await webview.executeJavaScript(`window.scrollTo(0, 0)`);
            else if (direction === 'bottom') await webview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
          } catch (err) {
            console.warn("Failed to scroll page:", err);
          }
        } else {
          console.warn("Cannot scroll iframes cross-origin.");
        }
      },
      onPressKey: async (key: string) => {
        const webview = guardedGuest();
        if (webview && typeof webview.sendInputEvent === 'function') {
          try {
            await webview.sendInputEvent({ type: 'keyDown', keyCode: key });
            await webview.sendInputEvent({ type: 'char', keyCode: key });
            await webview.sendInputEvent({ type: 'keyUp', keyCode: key });
          } catch (_) {}
        }
      },
      onTakeScreenshot: async () => {
        const webview = guardedGuest();
        if (webview && typeof webview.capturePage === 'function') {
          const image = await webview.capturePage();
          return image && typeof image.toDataURL === 'function' ? image.toDataURL() : '';
        }
        throw new Error("No active webview found");
      },
      onWait: (ms: number) => {
        const clampedMs = Math.min(30000, Math.max(0, Number.isFinite(Number(ms)) ? Math.floor(Number(ms)) : 0));
        return new Promise<void>(resolve => {
          let timer: ReturnType<typeof setTimeout>;
          const cleanup = () => {
            activeWaitTimersRef.current.delete(timer);
            activeWaitResolversRef.current.delete(handleResolve);
          };
          const handleResolve = () => {
            cleanup();
            clearTimeout(timer);
            resolve();
          };
          activeWaitResolversRef.current.add(handleResolve);
          timer = setTimeout(() => {
            handleResolve();
          }, clampedMs);
          activeWaitTimersRef.current.add(timer);
        });
      },
      onGetPageLinks: async () => {
        const webview = guardedGuest();
        if (webview) {
          // Cap the collected anchors (and clamp each field) so the IPC payload
          // itself stays bounded. Link-dense pages (Wikipedia, a sitemap, a large
          // category listing) hold tens of thousands of anchors, and a single
          // href can be a megabyte-sized data: URI — without a cap the
          // structured clone back to the app shell is what freezes the renderer.
          // The agent re-clamps to its own (smaller) budget; these limits are
          // only the transport guard.
          return await webview.executeJavaScript(`
            Array.from(document.querySelectorAll('a')).slice(0, 200).map(a => ({
              text: (a.innerText || '').trim().substring(0, 200),
              href: (a.href || '').substring(0, 500)
            })).filter(l => l.text && l.href)
          `);
        }
        return [];
      },
      onSearchHistory: (query: string) => {
        const q = (query || '').trim();
        if (!q) return [];
        const { history, bookmarks } = browserDataRef.current;
        const searchPool: SearchableItem[] = [
          ...(Array.isArray(bookmarks) ? bookmarks.map(b => ({ id: b.id, title: b.title, url: b.url, type: 'bookmark' as const })) : []),
          ...(Array.isArray(history) ? history.map(h => ({ id: h.id, title: h.title, url: h.url, type: 'history' as const, timestamp: h.timestamp })) : [])
        ];
        const matches = searchHistoryAndBookmarks(q, searchPool);
        const unique = Array.from(new Map(matches.map(item => [item.url, item])).values());
        return unique.slice(0, 10).map(u => ({ title: u.title, url: u.url }));
      },
      onReloadPage: async () => {
        const webview = guardedGuest();
        if (webview) {
          try {
            if (typeof webview.reload === 'function') {
              await webview.reload();
            } else if (typeof webview.executeJavaScript === 'function') {
              await webview.executeJavaScript('window.location.reload()');
            }
          } catch (_) {}
        }
      },
      onGoBack: async () => {
        const webview = guardedGuest();
        if (webview) {
          try {
            if (typeof webview.canGoBack === 'function') {
              if (webview.canGoBack()) await webview.goBack();
            } else if (typeof webview.goBack === 'function') {
              await webview.goBack();
            }
          } catch (_) {}
        }
      },
      onGoForward: async () => {
        const webview = guardedGuest();
        if (webview) {
          try {
            if (typeof webview.canGoForward === 'function') {
              if (webview.canGoForward()) await webview.goForward();
            } else if (typeof webview.goForward === 'function') {
              await webview.goForward();
            }
          } catch (_) {}
        }
      }
    });

    // 3. MCP action bridge over IPC: the main process delivers 'mcp-action-request'
    // events that only this trusted app page receives via the contextBridge, and
    // results go back through a sender-validated channel.
    const electronAPI = window.electronAPI;
    let unsubscribeMcpBridge: (() => void) | undefined;
    let unsubscribeMcpCancel: (() => void) | undefined;
    const pendingActions = new Map<string, { approvalId?: string; timer?: ReturnType<typeof setTimeout>; cancelled: boolean }>();
    const cancelAction = (id: string) => {
      const pending = pendingActions.get(id);
      if (!pending) return;
      pending.cancelled = true;
      if (pending.timer) clearTimeout(pending.timer);
      if (pending.approvalId) orchestrator.denyAction(pending.approvalId);
      pendingActions.delete(id);
    };

    if (electronAPI?.onMcpActionRequest && electronAPI.respondMcpAction) {
      unsubscribeMcpBridge = electronAPI.onMcpActionRequest((id, toolName, args, deadline) => {
        if (!settingsRef.current?.mcpServerEnabled) {
          electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution rejected: MCP server is disabled in settings.' });
          return;
        }
        if (!Number.isFinite(deadline) || Date.now() >= deadline) {
          electronAPI.respondMcpAction?.(id, { error: 'MCP action expired before execution.' });
          return;
        }
        const pending: { approvalId?: string; timer?: ReturnType<typeof setTimeout>; cancelled: boolean } = { cancelled: false };
        pendingActions.set(id, pending);
        pending.timer = setTimeout(() => cancelAction(id), Math.max(0, deadline - Date.now()));
        const approvedTarget = captureTarget();
        const targetIndependent = new Set(['nova_browser_info', 'browser_list_tabs', 'browser_get_url', 'browser_wait', 'browser_new_tab']);
        const canExecute = () => !pending.cancelled && Date.now() < deadline && Boolean(settingsRef.current?.mcpServerEnabled) &&
          (targetIndependent.has(toolName) || targetIsCurrent(approvedTarget));
        const finish = () => {
          if (pending.timer) clearTimeout(pending.timer);
          pendingActions.delete(id);
        };
        // Security (G-2): Harmless metadata tools execute directly.
        // Sensitive content inspection tools require user approval.
        const safeMetadataTools = new Set([
          'nova_browser_info',
          'browser_list_tabs',
          'browser_get_url',
          'browser_wait'
        ]);

        const runAction = () => {
          if (!canExecute()) {
            if (pending.approvalId) orchestrator.updateActionState(pending.approvalId, 'denied');
            electronAPI.respondMcpAction?.(id, { error: 'MCP action was cancelled, expired, or disabled.' });
            finish();
            return;
          }
          if (pending.approvalId) orchestrator.updateActionState(pending.approvalId, 'executing');
          executeMcpAction(toolName, args, canExecute)
            .then(result => {
              if (pending.approvalId) orchestrator.updateActionState(pending.approvalId, 'completed', result);
              if (!pending.cancelled) electronAPI.respondMcpAction?.(id, result);
            })
            .catch(err => {
              if (pending.approvalId) orchestrator.updateActionState(pending.approvalId, 'failed', undefined, String(err));
              if (!pending.cancelled) electronAPI.respondMcpAction?.(id, { error: String(err) });
            }).finally(finish);
        };

        if (safeMetadataTools.has(toolName)) {
          runAction();
        } else {
          const { id: approvalId, done } = orchestrator.enqueueAction(toolName, args);
          pending.approvalId = approvalId;
          done.then(approved => {
            if (approved) {
              runAction();
            } else {
              if (!pending.cancelled) electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution denied by user approval policy.' });
              finish();
            }
          }).catch(err => {
            if (!pending.cancelled) electronAPI.respondMcpAction?.(id, { error: String(err) });
            finish();
          });
        }
      });
      unsubscribeMcpCancel = electronAPI.onMcpActionCancel?.(cancelAction);
    }
    return () => {
      for (const guest of Array.from(document.querySelectorAll('webview'))) guestListeners.get(guest)?.();
      unsubscribeMcpBridge?.();
      unsubscribeMcpCancel?.();
      for (const id of pendingActions.keys()) cancelAction(id);
      activeWaitTimersRef.current.forEach(clearTimeout);
      activeWaitTimersRef.current.clear();
      activeWaitResolversRef.current.forEach(resolve => resolve());
      activeWaitResolversRef.current.clear();
    };
  }, []);
}

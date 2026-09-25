import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { Bookmark, HistoryItem, Tab, UserSettings } from '../types/browser';
import { aiAgent } from '../services/aiAgent';
import { orchestrator } from '../services/agentOrchestrator';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
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

  useEffect(() => {
    // 1. Define executeMcpAction as a local function (not exposed on window)
    // VULN-11 FIX: Removed global window assignment to prevent any webpage or extension
    // from invoking browser control APIs. The MCP server in the main process can invoke
    // this function via webContents.executeJavaScript() instead of relying on a global.
    const executeMcpAction = async (toolName: string, args: any) => {
      if (!toolName || typeof toolName !== 'string') {
        return "Error: Invalid toolName parameter";
      }
      const safeArgs = (args && typeof args === 'object') ? args : {};
      const { activeTabId, tabs } = browserDataRef.current;
      const activeWebview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;

      switch (toolName) {
        case 'browser_navigate':
          if (!safeArgs.url || typeof safeArgs.url !== 'string') return "Error: Missing or invalid 'url' parameter";
          if (!isSafeNavigationUrl(safeArgs.url)) return "Error: Navigation to this destination is blocked for security.";
          mcpHandlersRef.current.handleNavigate(safeArgs.url);
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
          if (!isSafeNavigationUrl(newUrl)) {
            return `Error: Navigation blocked for unsafe URL scheme: ${newUrl}`;
          }
          mcpHandlersRef.current.handleNewTab(newUrl);
          return `Opened new tab: ${newUrl}`;
        }

        case 'browser_go_back':
          if (activeWebview && activeWebview.goBack) {
            activeWebview.goBack();
            return "Navigated back";
          }
          return "Error: No active webview.";

        case 'browser_go_forward':
          if (activeWebview && activeWebview.goForward) {
            activeWebview.goForward();
            return "Navigated forward";
          }
          return "Error: No active webview.";

        case 'browser_reload':
          if (activeWebview && activeWebview.reload) {
            activeWebview.reload();
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
            activeWebview.setZoomLevel(zoomLevel);
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
      onNavigate: (url: string) => {
        mcpHandlersRef.current.handleNavigate(url);
      },
      onExecuteScript: async (script: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview && webview.executeJavaScript) {
          try {
            return await webview.executeJavaScript(script);
          } catch (e) {
            console.error("AI execution error:", e);
            throw e;
          }
        }

        const iframe = document.querySelector(`iframe[data-tab-id="${browserDataRef.current.activeTabId}"]`) as HTMLIFrameElement;
        if (iframe) {
          console.warn("AI scripts cannot be executed in iframes due to cross-origin security. Please run the app in Electron.");
          return "Error: Cannot read page content in web development mode. Please run the desktop app.";
        }

        throw new Error("No active webview or iframe found");
      },
      onCreateTab: (url: string) => mcpHandlersRef.current.handleNewTab(url),
      onCloseTab: (id?: string) => {
        const targetId = id || browserDataRef.current.activeTabId;
        if (targetId) mcpHandlersRef.current.handleCloseTab(targetId);
      },
      onSwitchTab: (id: string) => mcpHandlersRef.current.handleSelectTab(id),
      onGetAllTabs: () => browserDataRef.current.tabs.map(t => ({ id: t.id, title: t.title, url: t.url })),
      onScrollPage: (direction, amount) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        const cleanAmount = Math.min(10000, Math.max(0, Math.abs(Number(amount) || 500)));
        if (webview && webview.executeJavaScript) {
          if (direction === 'up') webview.executeJavaScript(`window.scrollBy(0, -${cleanAmount})`);
          if (direction === 'down') webview.executeJavaScript(`window.scrollBy(0, ${cleanAmount})`);
          if (direction === 'top') webview.executeJavaScript(`window.scrollTo(0, 0)`);
          if (direction === 'bottom') webview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
        } else {
          console.warn("Cannot scroll iframes cross-origin.");
        }
      },
      onPressKey: (key: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          webview.sendInputEvent({ type: 'keyDown', keyCode: key });
          webview.sendInputEvent({ type: 'char', keyCode: key });
          webview.sendInputEvent({ type: 'keyUp', keyCode: key });
        }
      },
      onTakeScreenshot: async () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          const image = await webview.capturePage();
          return image.toDataURL();
        }
        throw new Error("No active webview found");
      },
      onWait: (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      onGetPageLinks: async () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          return await webview.executeJavaScript(`
            Array.from(document.querySelectorAll('a')).map(a => ({
              text: a.innerText.trim(),
              href: a.href
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
      onReloadPage: () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview && webview.reload) {
          webview.reload();
        } else if (webview && webview.executeJavaScript) {
          webview.executeJavaScript('window.location.reload()');
        }
      },
      onGoBack: () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview && webview.canGoBack && webview.canGoBack()) {
          webview.goBack();
        } else if (webview && webview.goBack) {
          webview.goBack();
        }
      },
      onGoForward: () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview && webview.canGoForward && webview.canGoForward()) {
          webview.goForward();
        } else if (webview && webview.goForward) {
          webview.goForward();
        }
      }
    });

    // 3. MCP action bridge over IPC: the main process delivers 'mcp-action-request'
    // events that only this trusted app page receives via the contextBridge, and
    // results go back through a sender-validated channel.
    const electronAPI = window.electronAPI;
    let unsubscribeMcpBridge: (() => void) | undefined;
    if (electronAPI?.onMcpActionRequest && electronAPI.respondMcpAction) {
      unsubscribeMcpBridge = electronAPI.onMcpActionRequest((id, toolName, args) => {
        if (!settingsRef.current?.mcpServerEnabled) {
          electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution rejected: MCP server is disabled in settings.' });
          return;
        }
        // Security (G-2): Harmless metadata tools execute directly.
        // Sensitive content inspection tools require user approval.
        const safeMetadataTools = new Set([
          'nova_browser_info',
          'browser_list_tabs',
          'browser_get_url',
          'browser_wait'
        ]);

        const runAction = () => {
          executeMcpAction(toolName, args)
            .then(result => electronAPI.respondMcpAction?.(id, result))
            .catch(err => electronAPI.respondMcpAction?.(id, { error: String(err) }));
        };

        if (safeMetadataTools.has(toolName)) {
          runAction();
        } else {
          const { done } = orchestrator.enqueueAction(toolName, args);
          done.then(approved => {
            if (approved) {
              runAction();
            } else {
              electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution denied by user approval policy.' });
            }
          }).catch(err => {
            electronAPI.respondMcpAction?.(id, { error: String(err) });
          });
        }
      });
    }
    return () => {
      unsubscribeMcpBridge?.();
    };
  }, []);
}

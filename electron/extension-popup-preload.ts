import { contextBridge, ipcRenderer } from 'electron';

// Runs in the extension's main world before its own popup scripts. Only a
// permission-filtered tab snapshot crosses the boundary, never Electron APIs.
export function installPopupTabBridge(tab: Record<string, unknown>): void {
  const chrome = (window as any).chrome;
  if (!chrome?.tabs) return;
  const tabs = chrome.tabs;
  const originalQuery = typeof tabs.query === 'function' ? tabs.query.bind(tabs) : null;
  const originalGet = typeof tabs.get === 'function' ? tabs.get.bind(tabs) : null;
  const respond = (value: unknown, callback?: (value: any) => void) => {
    if (typeof callback === 'function') { callback(value); return; }
    return Promise.resolve(value);
  };
  tabs.query = (query: Record<string, unknown> = {}, callback?: (value: any) => void) => {
    const knownFilters = ['active', 'currentWindow', 'lastFocusedWindow', 'windowId'];
    const isActiveQuery = query.active === true && query.currentWindow !== false && query.lastFocusedWindow !== false && Object.keys(query).every(key => knownFilters.includes(key)) &&
      (query.windowId === undefined || query.windowId === tab.windowId || query.windowId === -2);
    if (isActiveQuery) return respond([{ ...tab }], callback);
    if (originalQuery) return originalQuery(query, callback);
    return respond([], callback);
  };
  tabs.get = (id: number, callback?: (value: any) => void) => {
    if (id === tab.id) return respond({ ...tab }, callback);
    if (originalGet) return originalGet(id, callback);
    return respond(undefined, callback);
  };
}

try {
  const context = ipcRenderer.sendSync('extension-popup-context');
  if (context?.tabData && Number.isInteger(context.tabData.id)) {
    contextBridge.executeInMainWorld({ func: installPopupTabBridge, args: [context.tabData] });
  }
} catch (error) {
  console.error('[Extensions] Could not initialize popup tab context:', error);
}

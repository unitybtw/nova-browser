import { BrowserWindow, ipcMain } from 'electron';

// Security: MCP browser_* tools are forwarded to the renderer over an
// 'mcp-action-request' IPC and awaited on a channel gated by isTrustedSender()
// below — never executed as injected JS in the privileged UI context.
//
// Lives in its own module (instead of main.ts) so electron/mcpServer.ts can
// import requestRendererMcpAction without importing the whole composition root.

type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

interface PendingMcpAction {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

const pendingMcpActions = new Map<string, PendingMcpAction>();

let isTrustedSender: TrustedSenderCheck = () => false;

/**
 * Registers the 'mcp-action-response' IPC listener. Called once by main.ts
 * (the composition root) with its trusted-sender validator.
 */
export function initMcpBridge(trustedSenderCheck: TrustedSenderCheck): void {
  isTrustedSender = trustedSenderCheck;
  ipcMain.on('mcp-action-response', (event: Electron.IpcMainEvent, payload: { id?: unknown; result?: unknown }) => {
    if (!isTrustedSender(event)) return;
    const id = payload?.id;
    if (typeof id !== 'string') return;
    const pending = pendingMcpActions.get(id);
    if (!pending) return;
    pendingMcpActions.delete(id);
    clearTimeout(pending.timer);
    pending.resolve(payload.result);
  });
}

/**
 * Asks the trusted main window renderer to execute an MCP browser_* tool and
 * waits for its response. Rejects after a 15s timeout or if the window is gone.
 */
export function requestRendererMcpAction(win: BrowserWindow | null, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!win || win.isDestroyed()) {
      reject(new Error('Nova Browser window is not available'));
      return;
    }
    const id = Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    const timer = setTimeout(() => {
      pendingMcpActions.delete(id);
      reject(new Error(`MCP action '${toolName}' timed out waiting for renderer response`));
    }, 15000);
    pendingMcpActions.set(id, { resolve, reject, timer });
    try {
      win.webContents.send('mcp-action-request', id, toolName, args);
    } catch (err) {
      clearTimeout(timer);
      pendingMcpActions.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

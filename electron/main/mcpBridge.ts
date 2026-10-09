import { BrowserWindow, ipcMain } from 'electron';
import { randomBytes } from 'crypto';

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
  win: BrowserWindow;
  toolName: string;
  onClosed?: () => void;
}

const pendingMcpActions = new Map<string, PendingMcpAction>();

/** Revoke pending approvals on timeout, server shutdown, or policy changes. */
export function cancelPendingMcpActions(reason: string, toolName?: string): void {
  for (const [id, pending] of pendingMcpActions) {
    if (toolName && pending.toolName !== toolName) continue;
    pendingMcpActions.delete(id);
    clearTimeout(pending.timer);
    if (pending.onClosed) {
      try { pending.win.removeListener('closed', pending.onClosed); } catch (_) {}
    }
    try { pending.win.webContents.send('mcp-action-cancel', id); } catch (_) {}
    pending.reject(new Error(reason));
  }
}

let isTrustedSender: TrustedSenderCheck = () => false;

/**
 * Registers the 'mcp-action-response' IPC listener. Called once by main.ts
 * (the composition root) with its trusted-sender validator.
 */
export function initMcpBridge(trustedSenderCheck: TrustedSenderCheck): void {
  isTrustedSender = trustedSenderCheck;
  ipcMain.on('mcp-action-response', (event: Electron.IpcMainEvent, payload: { id?: unknown; result?: unknown; error?: unknown }) => {
    if (!isTrustedSender(event)) return;
    const id = payload?.id;
    if (typeof id !== 'string') return;
    const pending = pendingMcpActions.get(id);
    if (!pending) return;
    pendingMcpActions.delete(id);
    clearTimeout(pending.timer);
    if (pending.onClosed) {
      try { pending.win.removeListener('closed', pending.onClosed); } catch (_) {}
    }

    if (payload?.error) {
      pending.reject(new Error(typeof payload.error === 'string' ? payload.error : JSON.stringify(payload.error)));
      return;
    }
    if (payload?.result && typeof payload.result === 'object' && 'error' in (payload.result as Record<string, unknown>)) {
      const errVal = (payload.result as Record<string, unknown>).error;
      pending.reject(new Error(typeof errVal === 'string' ? errVal : JSON.stringify(errVal)));
      return;
    }
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
    const id = Date.now().toString(36) + '_' + randomBytes(8).toString('hex');
    const deadline = Date.now() + 15000;
    const timer = setTimeout(() => {
      const p = pendingMcpActions.get(id);
      if (p) {
        pendingMcpActions.delete(id);
        if (p.onClosed) {
          try { win.removeListener('closed', p.onClosed); } catch (_) {}
        }
      }
      try { win.webContents.send('mcp-action-cancel', id); } catch (_) {}
      reject(new Error(`MCP action '${toolName}' timed out waiting for renderer response`));
    }, 15000);
    timer.unref?.();

    const onClosed = () => {
      pendingMcpActions.delete(id);
      clearTimeout(timer);
      reject(new Error('Nova Browser window was closed'));
    };
    try {
      win.once('closed', onClosed);
    } catch (_) {}

    pendingMcpActions.set(id, { resolve, reject, timer, win, toolName, onClosed });
    try {
      win.webContents.send('mcp-action-request', id, toolName, args, deadline);
    } catch (err) {
      clearTimeout(timer);
      try { win.removeListener('closed', onClosed); } catch (_) {}
      pendingMcpActions.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  detail?: string;
  buttonLabel?: string;
}

/**
 * Non-blocking confirmation dialog that invokes Electron's native dialog IPC
 * when running inside Electron, and falls back to window.confirm in browser environments.
 */
export async function showConfirm(options: ConfirmDialogOptions | string): Promise<boolean> {
  const opts: ConfirmDialogOptions = typeof options === 'string' ? { message: options } : options;
  if (typeof window !== 'undefined' && (window as any).electronAPI?.showConfirmDialog) {
    try {
      return await (window as any).electronAPI.showConfirmDialog(opts);
    } catch (_) {}
  }
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(opts.message));
  }
  return Promise.resolve(false);
}

/**
 * Non-blocking alert dialog that invokes Electron's native dialog IPC
 * when running inside Electron, and falls back to window.alert in browser environments.
 */
export async function showAlert(options: AlertDialogOptions | string): Promise<void> {
  const opts: AlertDialogOptions = typeof options === 'string' ? { message: options } : options;
  if (typeof window !== 'undefined' && (window as any).electronAPI?.showConfirmDialog) {
    try {
      await (window as any).electronAPI.showConfirmDialog({
        title: opts.title || 'Nova Browser',
        message: opts.message,
        detail: opts.detail,
        confirmLabel: opts.buttonLabel || 'OK',
        cancelLabel: ''
      });
      return;
    } catch (_) {}
  }
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(opts.message);
  }
}


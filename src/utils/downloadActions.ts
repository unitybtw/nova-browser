import { getElectronAPI } from './electronBridge';
import { showAlert, type AlertDialogOptions } from './confirmDialog';

type DownloadActions = {
  openDownload?: (path: string) => Promise<boolean | 'cancelled'>;
  showDownloadInFolder?: (path: string) => Promise<boolean>;
};

/** A cancelled safety prompt is not an error. Other failures need visible feedback. */
export async function performDownloadAction(
  path: string | undefined,
  action: 'open' | 'reveal',
  api: DownloadActions | undefined = getElectronAPI(),
  notify: (options: AlertDialogOptions) => Promise<void> = showAlert
): Promise<boolean> {
  const title = action === 'open' ? 'Open download' : 'Show download in folder';
  const operation = action === 'open' ? api?.openDownload : api?.showDownloadInFolder;
  if (!operation) {
    await notify({ title, message: 'This action is available in the Nova desktop browser.' });
    return false;
  }
  if (path) {
    try {
      const result = await operation(path);
      if (result === true) return true;
      if (result === 'cancelled') return false;
    } catch {
      // IPC can disconnect while the native file manager is being opened.
    }
  }
  await notify({ title, message: 'The file could not be accessed. It may have been moved or removed, or your system may not allow this action.' });
  return false;
}

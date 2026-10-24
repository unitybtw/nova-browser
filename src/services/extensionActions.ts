import { getElectronAPI } from '../utils/electronBridge';
import type { ElectronAPI } from '../utils/electronBridge';
import { showAlert } from '../utils/confirmDialog';

export async function launchExtensionPopup(...args: Parameters<ElectronAPI['openExtensionPopup']>): Promise<boolean> {
  try {
    const api = getElectronAPI();
    if (!api?.openExtensionPopup) throw new Error('Extension windows are only available in the desktop app.');
    const result = await api.openExtensionPopup(...args);
    if (result?.success !== true) throw new Error(result?.error || 'The extension window could not be opened.');
    return true;
  } catch (error) {
    await showAlert({ title: 'Extension could not open', message: error instanceof Error ? error.message : 'The extension window could not be opened.' });
    return false;
  }
}

/** Returns false for a cancelled picker; throws unless installation is confirmed. */
export async function installUnpackedExtension(): Promise<boolean> {
  const api = getElectronAPI();
  if (!api?.selectExtensionFolder || !api.installExtension) throw new Error('Extension installation is unavailable in this window.');
  const selected = await api.selectExtensionFolder();
  if (selected?.canceled) return false;
  if (!selected?.folderPath) throw new Error('No extension folder was selected.');
  const result = await api.installExtension(selected.folderPath);
  if (result?.success !== true) throw new Error(result?.error || 'The extension installation was not confirmed.');
  return true;
}

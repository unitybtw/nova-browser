import { getElectronAPI } from '../utils/electronBridge';

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

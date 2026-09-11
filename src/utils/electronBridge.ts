import type { ElectronAPI } from '../vite-env';

export type { ElectronAPI };

export function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window !== 'undefined') {
    return window.electronAPI;
  }
  return undefined;
}

export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

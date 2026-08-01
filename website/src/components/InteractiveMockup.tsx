import { useEffect } from 'react';
import App from '../../src/App';
import { useTheme } from './ThemeProvider';

// Setup the mock electronAPI globally so the App doesn't crash on the web
if (typeof window !== 'undefined' && !(window as any).electronAPI) {
  (window as any).electronAPI = {
    isWebMockup: true,
    onTabUpdated: () => () => {},
    onShortcut: () => () => {},
    onExtensionChanged: () => () => {},
    onDownloadUpdate: () => () => {},
    onExtensionInstalledSilently: () => () => {},
    onAdBlocked: () => () => {},
    onTabThumbnailUpdate: () => () => {},
    onMcpClientChanged: () => () => {},
    listExtensions: async () => [],
    getAppVersion: async () => '1.0.7',
    onUpdateAvailable: () => () => {},
    onUpdateDownloaded: () => () => {},
    secureStoreGet: async () => null,
    secureStoreSet: async () => {},
    storeGet: async () => null,
    storeSet: async () => {},
    setVpn: () => {},
    setPrivacyShield: () => {},
    setTheme: () => {},
    clearIncognitoSession: async () => {},
    captureTabThumbnail: async () => null,
    removeExtension: async () => {},
    checkForUpdates: async () => {},
    installUpdate: async () => {},
    getSuggestions: async () => [],
    importChromeBookmarks: async () => ({ success: false }),
    getMcpStatus: async () => 'disconnected',
    getMcpToken: async () => null,
    getMcpToolSettings: async () => ({}),
    rotateMcpToken: async () => null,
    setMcpToolEnabled: async () => {},
    openExtensionPopup: async () => {},
  };
}

export const InteractiveMockup = () => {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Sync website theme with browser app theme mock if needed
    if ((window as any).electronAPI) {
      // Trigger a fake native theme update so the app matches
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      window.dispatchEvent(new CustomEvent('native-theme-updated', { detail: { shouldUseDarkColors: isDark } }));
    }
  }, [theme]);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden flex flex-col relative font-sans shadow-2xl border border-slate-200 dark:border-slate-800 h-[500px] md:h-[650px]">
      {/* 
        We wrap the App in a container that simulates the Electron frameless window.
        We disable dragging (drag-region) since it's inside a web page.
      */}
      <div className="w-full h-full relative" style={{ isolation: 'isolate' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .drag-region { -webkit-app-region: no-drag !important; }
        `}} />
        <App />
      </div>
    </div>
  );
};

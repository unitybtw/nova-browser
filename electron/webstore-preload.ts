import { ipcRenderer } from 'electron';

if (window.location.hostname.includes('chrome.google.com') || window.location.hostname.includes('chromewebstore.google.com')) {
  // Spoof navigator properties for Chrome Web Store
  Object.defineProperty(navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    configurable: true
  });

  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
    configurable: true
  });
}

// Setup the chrome.webstore API spoof
const setupWebstoreAPI = () => {
  const _window = window as any;
  _window.chrome = _window.chrome || {};
  
  _window.chrome.webstore = {
    install: (url?: string, successCallback?: () => void, failureCallback?: (err: string) => void) => {
      // Extract the 32-character extension ID
      const targetUrl = url || window.location.href;
      const match = targetUrl.match(/[a-p]{32}/);
      
      if (!match) {
        if (failureCallback) failureCallback('Could not determine extension ID');
        return;
      }
      
      const extensionId = match[0];
      
      // We will handle the actual installation via IPC in the main process
      ipcRenderer.invoke('install-from-webstore', extensionId)
        .then(result => {
          if (result.error) {
            if (failureCallback) failureCallback(result.error);
            else alert('Kurulum hatası: ' + result.error);
          } else {
            if (successCallback) successCallback();
            else alert('Eklenti başarıyla kuruldu!');
            
            // Reload the page to reflect the installed state
            window.location.reload();
          }
        })
        .catch(err => {
          if (failureCallback) failureCallback(err.message);
          else alert('Kurulum hatası: ' + err.message);
        });
    }
  };
  
  // Also provide webstorePrivate for newer Web Store versions
  _window.chrome.webstorePrivate = {
    beginInstallWithManifest3: (details: any, callback: (res: any) => void) => {
      _window.chrome.webstore.install(details.id, () => callback('success'), (err: string) => callback(err));
    },
    completeInstall: (id: string, callback: () => void) => {
      callback();
    },
    getBrowserLogin: (callback: (info: any) => void) => {
      callback({ login: '', loggedIn: false });
    },
    getExtensionStatus: (id: string, callback: (status: string) => void) => {
      callback('installable');
    },
    isInIncognitoMode: (callback: (isIncognito: boolean) => void) => callback(false)
  };
};

if (window.location.hostname.includes('chrome.google.com') || window.location.hostname.includes('chromewebstore.google.com')) {
  setupWebstoreAPI();

  // Re-inject if the page clears it
  window.addEventListener('DOMContentLoaded', setupWebstoreAPI);
}

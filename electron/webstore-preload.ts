import { ipcRenderer } from 'electron';

if (window.location.hostname.includes('chrome.google.com') || window.location.hostname.includes('chromewebstore.google.com')) {
  // Spoof navigator properties for Chrome Web Store
  Object.defineProperty(navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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

// Password Manager Form Detection
const detectPasswordForms = () => {
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    
    const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;
    if (passwordInput && passwordInput.value) {
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"])'));
      const passIndex = inputs.indexOf(passwordInput);
      let usernameInput = inputs[passIndex - 1] as HTMLInputElement;
      
      if (!usernameInput || (usernameInput.type !== 'text' && usernameInput.type !== 'email')) {
         usernameInput = form.querySelector('input[type="text"], input[type="email"]') as HTMLInputElement;
      }
      
      const username = usernameInput ? usernameInput.value : '';
      const password = passwordInput.value;
      const hostname = window.location.hostname;
      
      if (password) {
        // Send to the webview host (BrowserView.tsx)
        ipcRenderer.sendToHost('password-form-submitted', { hostname, username, password });
      }
    }
  }, true);
};

const attemptAutofill = async () => {
  const hostname = window.location.hostname;
  if (!hostname) return;
  
  try {
    const rawPasswords = await ipcRenderer.invoke('secure-store-get', 'passwords');
    if (!rawPasswords) return;
    
    const passwords = JSON.parse(rawPasswords);
    const saved = passwords.find((p: any) => p.hostname === hostname);
    if (!saved) return;
    
    const checkAndFill = () => {
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (passwordInput && !passwordInput.value) {
        passwordInput.value = saved.password;
        // Trigger React/Vue events if necessary
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
        const passIndex = inputs.indexOf(passwordInput);
        let usernameInput = inputs[passIndex - 1] as HTMLInputElement;
        
        if (!usernameInput || (usernameInput.type !== 'text' && usernameInput.type !== 'email')) {
           usernameInput = document.querySelector('input[type="text"], input[type="email"]') as HTMLInputElement;
        }
        
        if (usernameInput && !usernameInput.value) {
          usernameInput.value = saved.username;
          usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
          usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };
    
    checkAndFill();
    setTimeout(checkAndFill, 1000);
    setTimeout(checkAndFill, 3000);
  } catch (e) {}
};

window.addEventListener('DOMContentLoaded', () => {
  detectPasswordForms();
  attemptAutofill();
});

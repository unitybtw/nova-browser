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

  Object.defineProperty(navigator, 'userAgentData', {
    get: () => ({
      brands: [
        { brand: 'Not/A)Brand', version: '8' },
        { brand: 'Chromium', version: '126' },
        { brand: 'Google Chrome', version: '126' }
      ],
      mobile: false,
      platform: 'macOS',
      getHighEntropyValues: async (hints: string[]) => {
        return {
          architecture: 'x86',
          bitness: '64',
          brands: [
            { brand: 'Not/A)Brand', version: '8' },
            { brand: 'Chromium', version: '126' },
            { brand: 'Google Chrome', version: '126' }
          ],
          mobile: false,
          model: '',
          platform: 'macOS',
          platformVersion: '13.0.0',
          uaFullVersion: '126.0.0.0'
        };
      }
    }),
    configurable: true
  });
}

// Setup the chrome.webstore API spoof
const setupWebstoreAPI = () => {
  const _window = window as any;
  _window.chrome = _window.chrome || {};

  const showNovaToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const existing = document.getElementById('nova-extension-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'nova-extension-toast';
    
    let bgColor = '#3b82f6';
    if (type === 'success') bgColor = '#10b981';
    if (type === 'error') bgColor = '#ef4444';

    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background-color: ${bgColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    let iconSvg = '';
    if (type === 'info') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    } else if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    if (type !== 'info') {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
    
    return toast;
  };
  
  _window.chrome.webstore = {
    install: (url?: string, successCallback?: () => void, failureCallback?: (err: string) => void) => {
      const targetUrl = url || window.location.href;
      const match = targetUrl.match(/[a-p]{32}/);
      
      if (!match) {
        showNovaToast('Eklenti ID si bulunamadı.', 'error');
        if (failureCallback) failureCallback('Could not determine extension ID');
        return;
      }
      
      const extensionId = match[0];
      const loadingToast = showNovaToast("Nova Browser'a yükleniyor...", 'info');
      
      ipcRenderer.invoke('install-from-webstore', extensionId)
        .then(result => {
          loadingToast.remove();
          if (result.error) {
            showNovaToast('Kurulum hatası: ' + result.error, 'error');
            if (failureCallback) failureCallback(result.error);
          } else {
            showNovaToast('Eklenti başarıyla kuruldu!', 'success');
            if (successCallback) successCallback();
            setTimeout(() => window.location.reload(), 1500);
          }
        })
        .catch(err => {
          loadingToast.remove();
          showNovaToast('Kurulum hatası: ' + err.message, 'error');
          if (failureCallback) failureCallback(err.message);
        });
    }
  };
  
  _window.chrome.webstorePrivate = {
    beginInstallWithManifest3: (details: any, callback: (res: any) => void) => {
      _window.chrome.webstore.install(details.id, () => callback('success'), (err: string) => callback(err));
    },
    completeInstall: (id: string, callback: () => void) => { callback(); },
    getBrowserLogin: (callback: (info: any) => void) => { callback({ login: '', loggedIn: false }); },
    getExtensionStatus: (id: string, callback: (status: string) => void) => { callback('installable'); },
    isInIncognitoMode: (callback: (isIncognito: boolean) => void) => callback(false)
  };
};

const injectNovaBanner = () => {
  if (window.location.pathname.startsWith('/detail/')) {
    const existingBanner = document.getElementById('nova-extension-banner');
    if (existingBanner) return;

    const banner = document.createElement('div');
    banner.id = 'nova-extension-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 12px 24px;
      z-index: 9999999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <div>
          <div style="font-weight: 600; font-size: 15px;">Nova Browser Eklenti Sistemi</div>
          <div style="font-size: 13px; opacity: 0.9;">Bu eklentiyi tek tıkla Nova Browser'a kurabilirsiniz.</div>
        </div>
      </div>
      <button id="nova-install-btn" style="
        background: white;
        color: #4f46e5;
        border: none;
        padding: 8px 20px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">Nova'ya Ekle</button>
    `;

    document.body.prepend(banner);
    document.body.style.marginTop = '60px';

    document.getElementById('nova-install-btn')?.addEventListener('click', () => {
      if ((window as any).chrome?.webstore?.install) {
        (window as any).chrome.webstore.install();
      }
    });
  }
};

if (window.location.hostname.includes('chrome.google.com') || window.location.hostname.includes('chromewebstore.google.com')) {
  setupWebstoreAPI();
  window.addEventListener('DOMContentLoaded', () => {
    setupWebstoreAPI();
    injectNovaBanner();
  });
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

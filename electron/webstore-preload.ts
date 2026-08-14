import { ipcRenderer, webFrame } from 'electron';

if ((window as any).__novaPreloadInjected) {
  // Already injected
} else if (window.location.hostname.includes('chrome.google.com') || window.location.hostname.includes('chromewebstore.google.com')) {
  (window as any).__novaPreloadInjected = true;

  // Create Trusted Types policy to bypass CSP for innerHTML
  let policy: any = null;
  if ((window as any).trustedTypes && (window as any).trustedTypes.createPolicy) {
    try {
      policy = (window as any).trustedTypes.createPolicy('nova-extension', {
        createHTML: (s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, ''),
        createScript: (s: string) => s,
        createScriptURL: (s: string) => s
      });
    } catch(e) {}
  }
  
  const toHTML = (html: string) => policy ? policy.createHTML(html) : html;

  // 1. Setup the IPC bridge in the isolated world
  const showNovaToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const existing = document.getElementById('nova-extension-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'nova-extension-toast';
    
    let bgColor = '#3b82f6';
    if (type === 'success') bgColor = '#10b981';
    if (type === 'error') bgColor = '#ef4444';

    toast.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px); background-color: ${bgColor}; color: white; padding: 12px 24px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2); z-index: 999999; opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; align-items: center; gap: 8px;`;

    let iconSvg = '';
    if (type === 'info') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    } else if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    
    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = toHTML(iconSvg);
    
    toast.appendChild(svgWrap.firstChild!);
    toast.appendChild(textSpan);
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

  window.addEventListener('message', (event) => {
    const currentHost = window.location.hostname;
    if (!currentHost.includes('chromewebstore.google.com') && !currentHost.includes('chrome.google.com')) return;
    if (event.source !== window || !event.data || event.data.type !== 'NOVA_INSTALL_EXTENSION') return;
    
    const extensionId = event.data.extensionId;
    const loadingToast = showNovaToast("Nova Browser'a yükleniyor...", 'info');
      
    ipcRenderer.invoke('install-from-webstore', extensionId)
      .then(result => {
        loadingToast.remove();
        if (result.error) {
          showNovaToast('Kurulum hatası: ' + result.error, 'error');
          window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: false, error: result.error }, window.location.origin);
        } else {
          showNovaToast('Eklenti başarıyla kuruldu!', 'success');
          window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: true }, window.location.origin);
          setTimeout(() => window.location.reload(), 1500);
        }
      })
      .catch(err => {
        loadingToast.remove();
        showNovaToast('Kurulum hatası: ' + err.message, 'error');
        window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: false, error: err.message }, window.location.origin);
      });
  });

  const mainWorldScript = `
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
        getHighEntropyValues: async (hints) => {
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

    window.chrome = window.chrome || {};
    window.chrome.webstore = {
      install: (url, successCallback, failureCallback) => {
        const targetUrl = url || window.location.href;
        const match = targetUrl.match(/[a-p]{32}/);
        
        if (!match) {
          if (failureCallback) failureCallback('Could not determine extension ID');
          return;
        }
        
        const extensionId = match[0];
        
        const listener = (event) => {
          if (event.source !== window || !event.data || event.data.type !== 'NOVA_INSTALL_RESULT') return;
          window.removeEventListener('message', listener);
          
          if (event.data.success) {
            if (successCallback) successCallback();
          } else {
            if (failureCallback) failureCallback(event.data.error);
          }
        };
        window.addEventListener('message', listener);
        
        window.postMessage({ type: 'NOVA_INSTALL_EXTENSION', extensionId }, window.location.origin);
      }
    };
    
    window.chrome.webstorePrivate = {
      beginInstallWithManifest3: (details, callback) => {
        if (typeof callback === 'function') {
          window.chrome.webstore.install(details.id, () => callback('success'), (err) => callback(err));
        } else {
          return new Promise((resolve, reject) => {
            window.chrome.webstore.install(details.id, () => resolve('success'), (err) => reject(err));
          });
        }
      },
      completeInstall: (id, callback) => { 
        if (typeof callback === 'function') callback(); 
        else return Promise.resolve();
      },
      getBrowserLogin: (callback) => { 
        if (typeof callback === 'function') callback({ login: '', loggedIn: false }); 
        else return Promise.resolve({ login: '', loggedIn: false });
      },
      getExtensionStatus: (id, callback) => { 
        if (typeof callback === 'function') callback('installable'); 
        else return Promise.resolve('installable');
      },
      isInIncognitoMode: (callback) => {
        if (typeof callback === 'function') callback(false);
        else return Promise.resolve(false);
      }
    };
  `;

  // Synchronously execute spoofing in the main world (World ID: 0)
  webFrame.executeJavaScriptInIsolatedWorld(0, [{ code: mainWorldScript }]);

  // 3. Inject the UI Banner
  const injectNovaBanner = () => {
    if (window.location.pathname.includes('/detail/')) {
      const existingBanner = document.getElementById('nova-extension-banner');
      if (existingBanner) return;

      const banner = document.createElement('div');
      banner.id = 'nova-extension-banner';
      banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(90deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; z-index: 9999999; display: flex; justify-content: space-between; align-items: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);";

      const leftContainer = document.createElement('div');
      leftContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
      
      const iconWrap = document.createElement('div');
      iconWrap.innerHTML = toHTML("<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'></path><polyline points='3.27 6.96 12 12.01 20.73 6.96'></polyline><line x1='12' y1='22.08' x2='12' y2='12'></line></svg>");
      
      const textWrap = document.createElement('div');
      const title = document.createElement('div');
      title.style.cssText = 'font-weight: 600; font-size: 15px;';
      title.textContent = "Nova Browser Eklenti Sistemi";
      const subtitle = document.createElement('div');
      subtitle.style.cssText = 'font-size: 13px; opacity: 0.9;';
      subtitle.textContent = "Bu eklentiyi tek tikla Nova Browser'a kurabilirsiniz.";
      
      textWrap.appendChild(title);
      textWrap.appendChild(subtitle);
      leftContainer.appendChild(iconWrap.firstChild!);
      leftContainer.appendChild(textWrap);

      const btn = document.createElement('button');
      btn.id = 'nova-install-btn';
      btn.style.cssText = "background: white; color: #4f46e5; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
      btn.textContent = "Nova'ya Ekle";

      banner.appendChild(leftContainer);
      banner.appendChild(btn);

      document.body.prepend(banner);
      document.body.style.marginTop = '60px';

      btn.addEventListener('click', () => {
        const match = window.location.href.match(/[a-p]{32}/);
        if (match) {
          window.postMessage({ 
            type: 'NOVA_INSTALL_EXTENSION', 
            extensionId: match[0]
          }, window.location.origin);
        }
      });
    } else {
      const existingBanner = document.getElementById('nova-extension-banner');
      if (existingBanner) {
        existingBanner.remove();
        document.body.style.marginTop = '0px';
      }
    }
  };

  window.addEventListener('DOMContentLoaded', injectNovaBanner);
  setInterval(injectNovaBanner, 500);
}

// Password Manager Form Detection (Host notification only)
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
      
      const username = usernameInput ? String(usernameInput.value).substring(0, 100) : '';
      const password = String(passwordInput.value).substring(0, 500);
      const hostname = window.location.hostname;
      
      if (password && hostname) {
        // Send to the webview host (BrowserView.tsx)
        ipcRenderer.sendToHost('password-form-submitted', { hostname, username, password });
      }
    }
  }, true);
};

window.addEventListener('DOMContentLoaded', () => {
  detectPasswordForms();
});

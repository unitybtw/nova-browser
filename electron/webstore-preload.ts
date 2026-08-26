import { ipcRenderer, webFrame } from 'electron';

const currentHost = window.location.hostname.toLowerCase();
const isChromeWebStore = currentHost === 'chromewebstore.google.com' || currentHost === 'chrome.google.com';

if ((window as any).__novaPreloadInjected) {
  // Already injected
} else if (isChromeWebStore) {
  (window as any).__novaPreloadInjected = true;

  // 🔒 Security (L-5): The previous Trusted Types passthrough policy
  // ('nova-extension') forwarded HTML through a bypassable regex script-stripper
  // (e.g. unquoted event handlers like <img src=x onerror=alert(1)> survived).
  // All markup is now built with explicit DOM APIs (createElementNS +
  // setAttribute), so no innerHTML/Trusted Types policy is needed at all.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  type SvgPart = { tag: string; attrs: Record<string, string> };
  const buildSvgElement = (size: number, parts: SvgPart[]): SVGElement => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const part of parts) {
      const el = document.createElementNS(SVG_NS, part.tag);
      for (const [attr, value] of Object.entries(part.attrs)) {
        el.setAttribute(attr, value);
      }
      svg.appendChild(el);
    }
    return svg;
  };

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

    let iconParts: SvgPart[];
    if (type === 'info') {
      iconParts = [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
        { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12', y2: '12' } },
        { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12.01', y2: '8' } }
      ];
    } else if (type === 'success') {
      iconParts = [
        { tag: 'path', attrs: { d: 'M22 11.08V12a10 10 10 0 1 1-5.93-9.14' } },
        { tag: 'polyline', attrs: { points: '22 4 12 14.01 9 11.01' } }
      ];
    } else {
      iconParts = [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
        { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '12' } },
        { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12.01', y2: '16' } }
      ];
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.appendChild(buildSvgElement(18, iconParts));
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
    const host = window.location.hostname.toLowerCase();
    if (host !== 'chromewebstore.google.com' && host !== 'chrome.google.com') return;
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
      iconWrap.appendChild(buildSvgElement(24, [
        { tag: 'path', attrs: { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' } },
        { tag: 'polyline', attrs: { points: '3.27 6.96 12 12.01 20.73 6.96' } },
        { tag: 'line', attrs: { x1: '12', y1: '22.08', x2: '12', y2: '12' } }
      ]));
      
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

// Password Manager Form & Submission Detection
const detectPasswordForms = () => {
  let lastEnteredUsername = '';
  let lastSubmitTime = 0;
  let lastSubmittedPayload = '';

  // Track any entered username/email across multi-step forms
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (!target || target.tagName !== 'INPUT') return;
    const type = (target.type || '').toLowerCase();
    const name = (target.name || '').toLowerCase();
    const id = (target.id || '').toLowerCase();
    const autocomplete = (target.autocomplete || '').toLowerCase();

    if (
      type === 'text' || 
      type === 'email' || 
      type === 'tel' || 
      autocomplete.includes('username') || 
      autocomplete.includes('email') || 
      name.includes('user') || 
      name.includes('email') || 
      name.includes('login') || 
      id.includes('user') || 
      id.includes('email') || 
      id.includes('login')
    ) {
      if (target.value && target.value.trim().length > 0) {
        lastEnteredUsername = target.value.trim();
      }
    }
  }, true);

  const findUsernameForPassword = (pwdInput: HTMLInputElement, container?: Element | null): string => {
    const root = container || pwdInput.closest('form') || pwdInput.closest('div') || document;
    
    // 1. Look for explicit username/email autocomplete or name attributes
    const specificSelectors = [
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      'input[name*="user" i]',
      'input[name*="email" i]',
      'input[name*="login" i]',
      'input[id*="user" i]',
      'input[id*="email" i]',
      'input[id*="login" i]',
      'input[type="email"]'
    ];

    for (const sel of specificSelectors) {
      const el = root.querySelector(sel) as HTMLInputElement;
      if (el && el !== pwdInput && el.value && el.value.trim()) {
        return el.value.trim();
      }
    }

    // 2. Look for inputs preceding the password input
    const allInputs = Array.from(root.querySelectorAll('input:not([type="hidden"]):not([type="password"])')) as HTMLInputElement[];
    if (allInputs.length > 0) {
      for (let i = allInputs.length - 1; i >= 0; i--) {
        const val = allInputs[i].value?.trim();
        if (val && val.length > 0 && !allInputs[i].disabled) {
          return val;
        }
      }
    }

    // 3. Fallback to lastEnteredUsername on the page
    if (lastEnteredUsername) {
      return lastEnteredUsername;
    }

    // 4. Global search for any filled text/email input on document
    const docInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]')) as HTMLInputElement[];
    for (const inp of docInputs) {
      if (inp && inp.value?.trim()) {
        return inp.value.trim();
      }
    }

    return '';
  };

  const checkAndSubmitCredentials = (triggerEl?: Element | null) => {
    const now = Date.now();
    const hostname = window.location.hostname;
    if (!hostname || hostname === 'about:blank') return;

    // Find all password inputs on the page
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    if (passwordInputs.length === 0) return;

    // Pick the password input closest to trigger or the first non-empty one
    let targetPwd: HTMLInputElement | null = null;
    if (triggerEl) {
      const container = triggerEl.closest('form') || triggerEl.closest('div') || triggerEl.parentElement;
      if (container) {
        targetPwd = container.querySelector('input[type="password"]') as HTMLInputElement;
      }
    }
    if (!targetPwd || !targetPwd.value) {
      targetPwd = passwordInputs.find(p => p.value && p.value.length > 0) || null;
    }

    if (!targetPwd || !targetPwd.value) return;

    const password = String(targetPwd.value).substring(0, 500);
    const username = findUsernameForPassword(targetPwd, targetPwd.closest('form') || targetPwd.closest('div')) || lastEnteredUsername;
    
    if (!password || !username) return;

    const payloadKey = `${hostname}|${username}|${password}`;
    if (now - lastSubmitTime < 1500 && lastSubmittedPayload === payloadKey) {
      return; // Debounce rapid triggers
    }

    lastSubmitTime = now;
    lastSubmittedPayload = payloadKey;

    try {
      ipcRenderer.sendToHost('password-form-submitted', {
        hostname,
        username,
        password
      });
    } catch (_) {}
  };

  // 1. Traditional form submit event
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    checkAndSubmitCredentials(form);
  }, true);

  // 2. Enter key on password or username input
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT') {
        checkAndSubmitCredentials(target);
      }
    }
  }, true);

  // 3. Click on buttons or submit triggers (SPA login/register buttons)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    const btn = target.closest('button, input[type="submit"], input[type="button"], a[role="button"], div[role="button"]');
    if (btn) {
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
      const isSubmitBtn = (btn as HTMLInputElement).type === 'submit' ||
        /log\s*in|sign\s*in|sign\s*up|register|giriş|kayıt|devam|next|continue|submit|ileri|tamam|hesap/i.test(text);

      if (isSubmitBtn) {
        setTimeout(() => checkAndSubmitCredentials(btn), 50);
      }
    }
  }, true);
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', detectPasswordForms);
} else {
  detectPasswordForms();
}

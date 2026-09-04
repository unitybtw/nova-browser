import { ipcRenderer, webFrame } from 'electron';

const currentHost = window.location.hostname.toLowerCase();
const isChromeWebStore = currentHost === 'chromewebstore.google.com' || currentHost === 'chrome.google.com';

if ((window as any).__novaPreloadInjected) {
  // Already injected
} else if (isChromeWebStore) {
  (window as any).__novaPreloadInjected = true;

  // Security: all markup is built with explicit DOM APIs (createElementNS +
  // setAttribute) — no innerHTML, no Trusted Types policy needed.
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
    if (event.source !== window ||
        (event.origin !== 'https://chromewebstore.google.com' && event.origin !== 'https://chrome.google.com') ||
        !event.data || event.data.type !== 'NOVA_INSTALL_EXTENSION') return;
    
    const extensionId = event.data.extensionId;
    if (typeof extensionId !== 'string' || !/^[a-p]{32}$/.test(extensionId)) {
      showNovaToast('Invalid extension identifier.', 'error');
      return;
    }
    const loadingToast = showNovaToast("Installing to Nova Browser...", 'info');
      
    ipcRenderer.invoke('install-from-webstore', extensionId)
      .then(result => {
        loadingToast.remove();
        if (result.error) {
          showNovaToast('Installation error: ' + result.error, 'error');
          window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: false, error: result.error }, window.location.origin);
        } else {
          showNovaToast('Extension installed successfully!', 'success');
          window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: true }, window.location.origin);
          setTimeout(() => window.location.reload(), 1500);
        }
      })
      .catch(err => {
        loadingToast.remove();
        showNovaToast('Installation error: ' + err.message, 'error');
        window.postMessage({ type: 'NOVA_INSTALL_RESULT', success: false, error: err.message }, window.location.origin);
      });
  });

  const chromeVer = (typeof process !== 'undefined' && process.versions && process.versions.chrome) || '150.0.0.0';
  const majorVer = chromeVer.split('.')[0] || '150';
  const plat = typeof process !== 'undefined' ? process.platform : 'darwin';
  const arch = typeof process !== 'undefined' ? process.arch : 'x64';

  let osUserAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
  let platformName = 'macOS';
  let platformVersion = '14.0.0';
  let architecture = arch === 'arm64' ? 'arm' : 'x86';

  if (plat === 'win32') {
    osUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
    platformName = 'Windows';
    platformVersion = '10.0.0';
    architecture = 'x86';
  } else if (plat === 'linux') {
    osUserAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
    platformName = 'Linux';
    platformVersion = '6.5.0';
    architecture = 'x86';
  }

  const mainWorldScript = `
    (() => {
      const greaseChars = [' ', '(', ':', ')', '=', '/', ';', '_', '-', '.', '?'];
      const c1 = greaseChars[Math.floor(Math.random() * greaseChars.length)];
      const c2 = greaseChars[Math.floor(Math.random() * greaseChars.length)];
      const greaseBrand = 'Not' + c1 + 'A' + c2 + 'Brand';
      const greaseVersion = ['8', '24', '99'][Math.floor(Math.random() * 3)];

      const dynamicBrands = [
        { brand: greaseBrand, version: greaseVersion },
        { brand: 'Chromium', version: ${JSON.stringify(majorVer)} },
        { brand: 'Google Chrome', version: ${JSON.stringify(majorVer)} }
      ];

      Object.defineProperty(navigator, 'userAgent', {
        get: () => ${JSON.stringify(osUserAgent)},
        configurable: true
      });

      Object.defineProperty(navigator, 'vendor', {
        get: () => 'Google Inc.',
        configurable: true
      });

      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: dynamicBrands,
          mobile: false,
          platform: ${JSON.stringify(platformName)},
          getHighEntropyValues: async (hints) => {
            return {
              architecture: ${JSON.stringify(architecture)},
              bitness: '64',
              brands: dynamicBrands,
              mobile: false,
              model: '',
              platform: ${JSON.stringify(platformName)},
              platformVersion: ${JSON.stringify(platformVersion)},
              uaFullVersion: ${JSON.stringify(chromeVer)}
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
        
        const listener = (event: MessageEvent) => {
          if (event.source !== window || event.origin !== window.location.origin || !event.data || event.data.type !== 'NOVA_INSTALL_RESULT') return;
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
  })();
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
      title.textContent = "Nova Browser Extension System";
      const subtitle = document.createElement('div');
      subtitle.style.cssText = 'font-size: 13px; opacity: 0.9;';
      subtitle.textContent = "Install this extension with 1-click directly into Nova Browser.";
      
      textWrap.appendChild(title);
      textWrap.appendChild(subtitle);
      leftContainer.appendChild(iconWrap.firstChild!);
      leftContainer.appendChild(textWrap);

      const btn = document.createElement('button');
      btn.id = 'nova-install-btn';
      btn.style.cssText = "background: white; color: #4f46e5; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
      btn.textContent = "Add to Nova";

      banner.appendChild(leftContainer);
      banner.appendChild(btn);

      document.body.prepend(banner);
      document.body.style.marginTop = '60px';

      btn.addEventListener('click', () => {
        const match = window.location.href.match(/[a-p]{32}/);
        if (match) {
          btn.setAttribute('disabled', 'true');
          btn.style.opacity = '0.7';
          btn.textContent = "Installing...";

          const cleanupListener = (e: MessageEvent) => {
            if (e.source !== window || e.origin !== window.location.origin || !e.data || e.data.type !== 'NOVA_INSTALL_RESULT') return;
            window.removeEventListener('message', cleanupListener);
            if (e.data.success) {
              btn.textContent = "Installed!";
              btn.style.background = "#10b981";
              btn.style.color = "white";
            } else {
              btn.removeAttribute('disabled');
              btn.style.opacity = '1';
              btn.textContent = "Add to Nova";
            }
          };
          window.addEventListener('message', cleanupListener);

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

  // SPA navigation can replace the detail page without firing DOMContentLoaded.
  // Observe DOM changes instead of polling the entire document every 500ms.
  let bannerUpdateQueued = false;
  const scheduleBannerUpdate = () => {
    if (bannerUpdateQueued) return;
    bannerUpdateQueued = true;
    queueMicrotask(() => {
      bannerUpdateQueued = false;
      injectNovaBanner();
    });
  };

  const startBannerObserver = () => {
    scheduleBannerUpdate();
    const observer = new MutationObserver(scheduleBannerUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startBannerObserver, { once: true });
  } else {
    startBannerObserver();
  }
}

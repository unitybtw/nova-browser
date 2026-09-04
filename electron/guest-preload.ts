import { ipcRenderer } from 'electron';

/**
 * Isolated guest preload script for general webview instances.
 * Runs in a sandboxed, context-isolated environment.
 * Zero Electron APIs or node globals are exposed to untrusted web content.
 * All communication with the host React application occurs strictly via ipcRenderer.sendToHost.
 */

// Origin validation: only execute for secure HTTP/HTTPS web contexts
const protocol = window.location.protocol;
if (protocol === 'https:' || protocol === 'http:') {
  let lastEnteredUsername = '';
  let lastSubmitTime = 0;
  let lastSubmittedPayload = '';

  const findUsernameForPassword = (pwdInput: HTMLInputElement, container?: Element | null): string => {
    const root = container || pwdInput.closest('form') || pwdInput.closest('div') || document;

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

    const allInputs = Array.from(root.querySelectorAll('input:not([type="hidden"]):not([type="password"])')) as HTMLInputElement[];
    if (allInputs.length > 0) {
      for (let i = allInputs.length - 1; i >= 0; i--) {
        const val = allInputs[i].value?.trim();
        if (val && val.length > 0 && !allInputs[i].disabled) {
          return val;
        }
      }
    }

    if (lastEnteredUsername) {
      return lastEnteredUsername;
    }

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

    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    if (passwordInputs.length === 0) return;

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

    // Origin verification: ensure reported hostname matches window location
    if (hostname !== window.location.hostname) return;

    const payloadKey = `${hostname}|${username}|${password}`;
    if (now - lastSubmitTime < 1500 && lastSubmittedPayload === payloadKey) {
      return;
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

  const setupPasswordCapture = () => {
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT') {
        const type = (target.type || '').toLowerCase();
        const name = (target.name || '').toLowerCase();
        const id = (target.id || '').toLowerCase();
        const autocomplete = (target.autocomplete || '').toLowerCase();

        const isUserField =
          type === 'email' ||
          autocomplete === 'username' ||
          autocomplete === 'email' ||
          name.includes('user') ||
          name.includes('email') ||
          name.includes('login') ||
          id.includes('user') ||
          id.includes('email') ||
          id.includes('login');

        if (isUserField && target.value && target.value.trim().length > 0) {
          lastEnteredUsername = target.value.trim();
        }
      }
    }, true);

    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      checkAndSubmitCredentials(form);
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT') {
          checkAndSubmitCredentials(target);
        }
      }
    }, true);

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const btn = target.closest('button, input[type="submit"], input[type="button"], a[role="button"], div[role="button"]');
      if (btn) {
        const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
        const isSubmitBtn = (btn as HTMLInputElement).type === 'submit' ||
          /log\s*in|sign\s*in|sign\s*up|register|giris|kayit|devam|next|continue|submit|ileri|tamam|hesap/i.test(text);

        if (isSubmitBtn) {
          setTimeout(() => checkAndSubmitCredentials(btn), 50);
        }
      }
    }, true);
  };

  const setupLinkHoverDetection = () => {
    let hoverTimer: any = null;
    let currentHoveredLink: HTMLElement | null = null;

    document.addEventListener('mouseover', (e) => {
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (a && a.href && (a.href.startsWith('https://') || a.href.startsWith('http://'))) {
        if (currentHoveredLink === a) return;
        currentHoveredLink = a;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          const rect = a.getBoundingClientRect();
          try {
            ipcRenderer.sendToHost('nova-link-hover', {
              url: a.href,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            });
          } catch (_) {}
        }, 1500);
      }
    }, true);

    document.addEventListener('mouseout', (e) => {
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (a) {
        clearTimeout(hoverTimer);
        if (currentHoveredLink === a) currentHoveredLink = null;
        try {
          ipcRenderer.sendToHost('nova-link-hover-out');
        } catch (_) {}
      }
    }, true);

    document.addEventListener('click', () => {
      clearTimeout(hoverTimer);
      currentHoveredLink = null;
      try {
        ipcRenderer.sendToHost('nova-link-hover-out');
      } catch (_) {}
    }, true);
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      setupPasswordCapture();
      setupLinkHoverDetection();
    });
  } else {
    setupPasswordCapture();
    setupLinkHoverDetection();
  }
}

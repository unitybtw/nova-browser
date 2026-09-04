import { EventEmitter } from 'node:events';

export interface MockWebContents {
  id: number;
  url: string;
  isDestroyed: () => boolean;
}

export interface MockIpcEvent {
  sender: MockWebContents;
}

export class ElectronHarness {
  private handlers = new Map<string, (event: MockIpcEvent, ...args: any[]) => any>();
  private listeners = new Map<string, Array<(event: MockIpcEvent, ...args: any[]) => void>>();
  private secureStore = new Map<string, string>();
  private localStorage = new Map<string, string>();
  private webviews = new Map<number, { src: string; preload?: string; suspended: boolean }>();
  private nextWebContentsId = 100;

  public registerHandler(channel: string, handler: (event: MockIpcEvent, ...args: any[]) => any): void {
    this.handlers.set(channel, handler);
  }

  public registerListener(channel: string, listener: (event: MockIpcEvent, ...args: any[]) => void): void {
    const list = this.listeners.get(channel) || [];
    list.push(listener);
    this.listeners.set(channel, list);
  }

  public async invoke(channel: string, sender: MockWebContents, ...args: any[]): Promise<any> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for IPC channel: ${channel}`);
    }
    const event: MockIpcEvent = { sender };
    return await handler(event, ...args);
  }

  public send(channel: string, sender: MockWebContents, ...args: any[]): void {
    const list = this.listeners.get(channel) || [];
    const event: MockIpcEvent = { sender };
    list.forEach(fn => fn(event, ...args));
  }

  public createWebContents(url: string = 'about:blank'): MockWebContents {
    const id = this.nextWebContentsId++;
    return {
      id,
      url,
      isDestroyed: () => false
    };
  }

  public setSecureItem(key: string, value: string): void {
    this.secureStore.set(key, value);
  }

  public getSecureItem(key: string): string | null {
    return this.secureStore.get(key) || null;
  }

  public setLocalStorageItem(key: string, value: string): void {
    this.localStorage.set(key, value);
  }

  public getLocalStorageItem(key: string): string | null {
    return this.localStorage.has(key) ? (this.localStorage.get(key) ?? null) : null;
  }

  public removeLocalStorageItem(key: string): void {
    this.localStorage.delete(key);
  }

  /**
   * Simulates Electron will-attach-webview hook
   */
  public attachWebview(params: { src: string; preload?: string }): { allowed: boolean; attachedPreload?: string; error?: string } {
    const rawSrc = String(params.src || '').trim();
    const lower = rawSrc.toLowerCase();

    // Dangerous protocols must be blocked
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) {
      return { allowed: false, error: 'Dangerous protocol blocked' };
    }

    let attachedPreload = 'preload.cjs';
    try {
      const parsed = new URL(rawSrc);
      const host = parsed.hostname.toLowerCase();
      if (host === 'chromewebstore.google.com' || host === 'chrome.google.com') {
        attachedPreload = 'webstore-preload.cjs';
      }
    } catch (_) {}

    return { allowed: true, attachedPreload };
  }
}

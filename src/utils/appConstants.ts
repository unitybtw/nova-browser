import type { VpnLocation } from '../types/browser';

export const DEFAULT_VPN_LOCATION: VpnLocation = {
  id: 'direct',
  name: 'Direct Connection',
  url: '',
  type: 'free',
};

export const DEFAULT_VPN_LOCATIONS: VpnLocation[] = [
  { id: 'direct', name: 'Direct Connection', url: '', type: 'free' },
  { id: 'local-socks', name: 'Local SOCKS5 (127.0.0.1:1080)', url: 'socks5://127.0.0.1:1080', type: 'custom' },
  { id: 'tor-socks', name: 'Tor Proxy (127.0.0.1:9050)', url: 'socks5://127.0.0.1:9050', type: 'custom' },
];

export const EMPTY_ARRAY: never[] = [];

export const normalizeAIActionPayload = (detail: unknown): string => {
  if (typeof detail === 'string') return detail.trim();
  if (!detail || typeof detail !== 'object') return '';
  const payload = detail as Record<string, unknown>;
  for (const key of ['action', 'prompt', 'text', 'query']) {
    if (typeof payload[key] === 'string' && payload[key].trim()) return payload[key].trim();
  }
  return '';
};

export type DemoParams = {
  isDemo: boolean;
  feature: string;
  bg: string;
  theme: 'dark' | 'light';
  tabs: string;
  showTasksWidget?: boolean;
};

// Demo mode query parameter inspection
export const getDemoParams = (): DemoParams => {
  if (typeof window === 'undefined') return { isDemo: false, feature: 'default', bg: 'default', theme: 'dark', tabs: 'horizontal' };
  const params = new URLSearchParams(window.location.search);
  return {
    isDemo: params.get('demo') === 'true',
    feature: params.get('feature') || 'default',
    bg: params.get('bg') || 'default',
    theme: ((params.get('theme') === 'light' ? 'light' : 'dark') as 'dark' | 'light'),
    tabs: params.get('tabs') || 'horizontal'
  };
};

// Platform detection constants (module-level to prevent TDZ issues in hooks and initializers)
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
export const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform || navigator.userAgent);
export const isLinux = typeof navigator !== 'undefined' && /Linux/i.test(navigator.platform || navigator.userAgent) && !/Android/i.test(navigator.userAgent);

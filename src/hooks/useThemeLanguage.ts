import { useEffect } from 'react';
import type { UserSettings } from '../types/browser';
import { setLanguage } from '../services/i18n';
import { getElectronAPI } from '../utils/electronBridge';

export interface UseThemeLanguageOptions {
  settings: UserSettings;
}

/**
 * Tema + dil efektleri (App.tsx'ten birebir taşındı).
 *
 * - Tema efekti: settings.theme -> document.documentElement `dark` class,
 *   accent/browserColor paletlerini `:root` + `#nova-accent-style` üzerinden
 *   uygular, `getElectronAPI().setTheme` IPC'sini aynen çağırır, `system`
 *   modunda matchMedia dinleyicisi kurar.
 * - Dil efekti: settings.language -> `setLanguage()` (lang/dir + listener notify).
 *
 * İki efekt aynı hook içinde art arda tanımlı olduğu için ilk render'da aynı
 * commit'te çalışır; tema ve dil arasında ek bir paint olmaz (flash yok).
 * Sıralama orijinal App.tsx'teki gibidir (önce tema, sonra dil).
 */
export function useThemeLanguage({ settings }: UseThemeLanguageOptions) {
  // Apply Theme Mode & Custom Accent
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Apply custom accent colors via style injection
    const defaultColorMap: Record<string, string> = {
      'blue': '#3b82f6',
      'emerald': '#10b981',
      'purple': '#a855f7',
      'rose': '#f43f5e',
      'amber': '#f59e0b'
    };

    let hex = defaultColorMap['blue'];
    if (settings.accentColor === 'custom' && settings.customAccentColor) {
      const isValidHex = /^#[0-9a-fA-F]{3,8}$/.test(settings.customAccentColor);
      hex = isValidHex ? settings.customAccentColor : '#3b82f6';
    } else if (settings.accentColor && defaultColorMap[settings.accentColor]) {
      hex = defaultColorMap[settings.accentColor];
    }

    // Apply full browser UI colors via style injection
    const browserColorPreset = settings.browserColor || 'default';
    const isDark = document.documentElement.classList.contains('dark');

    interface BrowserThemePalette {
      slate950: string;
      slate900: string;
      slate800: string;
      slate700: string;
      slate200: string;
      slate100: string;
      slate50: string;
      background: string;
      card: string;
      popover: string;
      border: string;
      frame: string;
      header: string;
      toolbar: string;
      sidebar: string;
      activeTab: string;
      hover: string;
    }

    const browserColorPresets: Record<string, {
      dark: BrowserThemePalette;
      light: BrowserThemePalette;
    }> = {
      default: {
        dark: {
          slate950: '#07050d',
          slate900: '#151122',
          slate800: '#1e1b2e',
          slate700: '#2d2842',
          slate200: '#e2e8f0',
          slate100: '#f1f5f9',
          slate50: '#f8fafc',
          background: '#151122',
          card: '#1e1b2e',
          popover: '#1e1b2e',
          border: 'rgba(255, 255, 255, 0.08)',
          frame: '#151122',
          header: '#151122',
          toolbar: '#1e1b2e',
          sidebar: '#151122',
          activeTab: '#1e1b2e',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#020617',
          slate900: '#0f172a',
          slate800: '#1e293b',
          slate700: '#334155',
          slate200: '#e2e8f0',
          slate100: '#f1f5f9',
          slate50: '#f8fafc',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(0, 0, 0, 0.08)',
          frame: '#f1f5f9',
          header: '#f1f5f9',
          toolbar: '#ffffff',
          sidebar: '#f1f5f9',
          activeTab: '#ffffff',
          hover: 'rgba(0, 0, 0, 0.05)'
        }
      },
      midnight: {
        dark: {
          slate950: '#050811',
          slate900: '#0a101f',
          slate800: '#111b33',
          slate700: '#1c2a4f',
          slate200: '#cbd5e1',
          slate100: '#e2e8f0',
          slate50: '#f1f5f9',
          background: '#0a101f',
          card: '#111b33',
          popover: '#111b33',
          border: 'rgba(148, 163, 184, 0.12)',
          frame: '#050811',
          header: '#0a101f',
          toolbar: '#111b33',
          sidebar: '#050811',
          activeTab: '#111b33',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#0f172a',
          slate900: '#1e293b',
          slate800: '#334155',
          slate700: '#475569',
          slate200: '#d8e2ee',
          slate100: '#eaf0f8',
          slate50: '#f4f7fb',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(148, 163, 184, 0.25)',
          frame: '#eaf0f8',
          header: '#e2ebf5',
          toolbar: '#ffffff',
          sidebar: '#eaf0f8',
          activeTab: '#ffffff',
          hover: 'rgba(15, 23, 42, 0.05)'
        }
      },
      cyberpunk: {
        dark: {
          slate950: '#090314',
          slate900: '#120726',
          slate800: '#1d0d3d',
          slate700: '#2f175e',
          slate200: '#e9d5ff',
          slate100: '#f3e8ff',
          slate50: '#faf5ff',
          background: '#120726',
          card: '#1d0d3d',
          popover: '#1d0d3d',
          border: 'rgba(192, 132, 252, 0.15)',
          frame: '#090314',
          header: '#120726',
          toolbar: '#1d0d3d',
          sidebar: '#090314',
          activeTab: '#1d0d3d',
          hover: 'rgba(255, 255, 255, 0.07)'
        },
        light: {
          slate950: '#1e1b4b',
          slate900: '#2e1065',
          slate800: '#3b0764',
          slate700: '#581c87',
          slate200: '#ede3fc',
          slate100: '#f5eefd',
          slate50: '#faf7fe',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(168, 85, 247, 0.2)',
          frame: '#f5eefd',
          header: '#ede3fc',
          toolbar: '#ffffff',
          sidebar: '#f5eefd',
          activeTab: '#ffffff',
          hover: 'rgba(88, 28, 135, 0.05)'
        }
      },
      forest: {
        dark: {
          slate950: '#020d09',
          slate900: '#061a12',
          slate800: '#0d2a1f',
          slate700: '#154231',
          slate200: '#a7f3d0',
          slate100: '#d1fae5',
          slate50: '#ecfdf5',
          background: '#061a12',
          card: '#0d2a1f',
          popover: '#0d2a1f',
          border: 'rgba(52, 211, 153, 0.14)',
          frame: '#020d09',
          header: '#061a12',
          toolbar: '#0d2a1f',
          sidebar: '#020d09',
          activeTab: '#0d2a1f',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#022c22',
          slate900: '#064e3b',
          slate800: '#065f46',
          slate700: '#047857',
          slate200: '#d1fae5',
          slate100: '#e6f7ef',
          slate50: '#f2faf6',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(16, 185, 129, 0.2)',
          frame: '#e6f7ef',
          header: '#d9f2e6',
          toolbar: '#ffffff',
          sidebar: '#e6f7ef',
          activeTab: '#ffffff',
          hover: 'rgba(6, 78, 59, 0.05)'
        }
      },
      crimson: {
        dark: {
          slate950: '#120306',
          slate900: '#1d070c',
          slate800: '#2e0c15',
          slate700: '#471321',
          slate200: '#fecdd3',
          slate100: '#ffe4e6',
          slate50: '#fff1f2',
          background: '#1d070c',
          card: '#2e0c15',
          popover: '#2e0c15',
          border: 'rgba(244, 63, 94, 0.14)',
          frame: '#120306',
          header: '#1d070c',
          toolbar: '#2e0c15',
          sidebar: '#120306',
          activeTab: '#2e0c15',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#4c0519',
          slate900: '#881337',
          slate800: '#9f1239',
          slate700: '#be123c',
          slate200: '#fce7ea',
          slate100: '#fdf2f4',
          slate50: '#fff5f7',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(244, 63, 94, 0.2)',
          frame: '#fdf2f4',
          header: '#fae3e7',
          toolbar: '#ffffff',
          sidebar: '#fdf2f4',
          activeTab: '#ffffff',
          hover: 'rgba(159, 18, 57, 0.05)'
        }
      },
      warm: {
        dark: {
          slate950: '#0f0a07',
          slate900: '#18110c',
          slate800: '#261b13',
          slate700: '#3b2b20',
          slate200: '#fed7aa',
          slate100: '#ffedd5',
          slate50: '#fff7ed',
          background: '#18110c',
          card: '#261b13',
          popover: '#261b13',
          border: 'rgba(217, 119, 6, 0.14)',
          frame: '#0f0a07',
          header: '#18110c',
          toolbar: '#261b13',
          sidebar: '#0f0a07',
          activeTab: '#261b13',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#451a03',
          slate900: '#78350f',
          slate800: '#92400e',
          slate700: '#b45309',
          slate200: '#f6ebe2',
          slate100: '#fbf5ef',
          slate50: '#fdfaf6',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(180, 83, 9, 0.2)',
          frame: '#fbf5ef',
          header: '#f4e8dc',
          toolbar: '#ffffff',
          sidebar: '#fbf5ef',
          activeTab: '#ffffff',
          hover: 'rgba(120, 53, 15, 0.05)'
        }
      },
      ocean: {
        dark: {
          slate950: '#020d12',
          slate900: '#051720',
          slate800: '#0a2634',
          slate700: '#113a4f',
          slate200: '#a5f3fc',
          slate100: '#cffafe',
          slate50: '#ecfeff',
          background: '#051720',
          card: '#0a2634',
          popover: '#0a2634',
          border: 'rgba(6, 182, 212, 0.14)',
          frame: '#020d12',
          header: '#051720',
          toolbar: '#0a2634',
          sidebar: '#020d12',
          activeTab: '#0a2634',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#083344',
          slate900: '#164e63',
          slate800: '#155e75',
          slate700: '#0e7490',
          slate200: '#cffafe',
          slate100: '#e6f9fc',
          slate50: '#f2fcfe',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(6, 182, 212, 0.2)',
          frame: '#e6f9fc',
          header: '#d9f5fa',
          toolbar: '#ffffff',
          sidebar: '#e6f9fc',
          activeTab: '#ffffff',
          hover: 'rgba(14, 116, 144, 0.05)'
        }
      },
      sunset: {
        dark: {
          slate950: '#110601',
          slate900: '#1c0b02',
          slate800: '#2e1305',
          slate700: '#471f0a',
          slate200: '#fed7aa',
          slate100: '#ffedd5',
          slate50: '#fff7ed',
          background: '#1c0b02',
          card: '#2e1305',
          popover: '#2e1305',
          border: 'rgba(245, 158, 11, 0.15)',
          frame: '#110601',
          header: '#1c0b02',
          toolbar: '#2e1305',
          sidebar: '#110601',
          activeTab: '#2e1305',
          hover: 'rgba(255, 255, 255, 0.06)'
        },
        light: {
          slate950: '#451a03',
          slate900: '#78350f',
          slate800: '#92400e',
          slate700: '#b45309',
          slate200: '#fdecdb',
          slate100: '#fdf3ea',
          slate50: '#fef8f4',
          background: '#ffffff',
          card: '#ffffff',
          popover: '#ffffff',
          border: 'rgba(245, 158, 11, 0.22)',
          frame: '#fdf3ea',
          header: '#fae7d4',
          toolbar: '#ffffff',
          sidebar: '#fdf3ea',
          activeTab: '#ffffff',
          hover: 'rgba(180, 83, 9, 0.05)'
        }
      }
    };

    let activeDarkPalette: BrowserThemePalette;
    let activeLightPalette: BrowserThemePalette;

    if (browserColorPreset === 'custom') {
      const customHex = (settings.customBrowserColor && /^#[0-9a-fA-F]{3,8}$/.test(settings.customBrowserColor))
        ? settings.customBrowserColor
        : '#6366f1';
      activeDarkPalette = {
        slate950: `color-mix(in srgb, ${customHex} 12%, #030305)`,
        slate900: `color-mix(in srgb, ${customHex} 22%, #08080c)`,
        slate800: `color-mix(in srgb, ${customHex} 32%, #101017)`,
        slate700: `color-mix(in srgb, ${customHex} 45%, #181824)`,
        slate200: `color-mix(in srgb, ${customHex} 20%, #e2e8f0)`,
        slate100: `color-mix(in srgb, ${customHex} 10%, #f1f5f9)`,
        slate50: `color-mix(in srgb, ${customHex} 5%, #f8fafc)`,
        background: `color-mix(in srgb, ${customHex} 22%, #08080c)`,
        card: `color-mix(in srgb, ${customHex} 32%, #101017)`,
        popover: `color-mix(in srgb, ${customHex} 32%, #101017)`,
        border: `color-mix(in srgb, ${customHex} 30%, rgba(255, 255, 255, 0.08))`,
        frame: `color-mix(in srgb, ${customHex} 15%, #050508)`,
        header: `color-mix(in srgb, ${customHex} 22%, #08080c)`,
        toolbar: `color-mix(in srgb, ${customHex} 32%, #101017)`,
        sidebar: `color-mix(in srgb, ${customHex} 15%, #050508)`,
        activeTab: `color-mix(in srgb, ${customHex} 32%, #101017)`,
        hover: 'rgba(255, 255, 255, 0.06)'
      };
      activeLightPalette = {
        slate950: `color-mix(in srgb, ${customHex} 30%, #0f172a)`,
        slate900: `color-mix(in srgb, ${customHex} 25%, #1e293b)`,
        slate800: `color-mix(in srgb, ${customHex} 20%, #334155)`,
        slate700: `color-mix(in srgb, ${customHex} 15%, #475569)`,
        slate200: `color-mix(in srgb, ${customHex} 15%, #e2e8f0)`,
        slate100: `color-mix(in srgb, ${customHex} 10%, #f1f5f9)`,
        slate50: `color-mix(in srgb, ${customHex} 5%, #f8fafc)`,
        background: '#ffffff',
        card: '#ffffff',
        popover: '#ffffff',
        border: `color-mix(in srgb, ${customHex} 20%, #e2e8f0)`,
        frame: `color-mix(in srgb, ${customHex} 8%, #f8fafc)`,
        header: `color-mix(in srgb, ${customHex} 14%, #f1f5f9)`,
        toolbar: '#ffffff',
        sidebar: `color-mix(in srgb, ${customHex} 8%, #f8fafc)`,
        activeTab: '#ffffff',
        hover: 'rgba(0, 0, 0, 0.05)'
      };
    } else {
      const palette = browserColorPresets[browserColorPreset] || browserColorPresets.default;
      activeDarkPalette = palette.dark;
      activeLightPalette = palette.light;
    }

    const buildPaletteVariables = (palette: BrowserThemePalette, isDarkMode: boolean) => ({
      '--color-blue-50': `color-mix(in srgb, ${hex} 10%, white)`,
      '--color-blue-100': `color-mix(in srgb, ${hex} 20%, white)`,
      '--color-blue-200': `color-mix(in srgb, ${hex} 40%, white)`,
      '--color-blue-300': `color-mix(in srgb, ${hex} 60%, white)`,
      '--color-blue-400': `color-mix(in srgb, ${hex} 80%, white)`,
      '--color-blue-500': hex,
      '--color-blue-600': `color-mix(in srgb, ${hex} 80%, black)`,
      '--color-blue-700': `color-mix(in srgb, ${hex} 60%, black)`,
      '--color-blue-800': `color-mix(in srgb, ${hex} 40%, black)`,
      '--color-blue-900': `color-mix(in srgb, ${hex} 20%, black)`,
      '--color-blue-950': `color-mix(in srgb, ${hex} 10%, black)`,
      '--nova-accent': hex,
      '--nova-accent-hover': `color-mix(in srgb, ${hex} 80%, black)`,
      '--nova-accent-light': `color-mix(in srgb, ${hex} 20%, white)`,
      '--nova-accent-dark': `color-mix(in srgb, ${hex} 60%, black)`,
      '--nova-accent-text': '#ffffff',
      '--color-accent': hex,
      '--color-accent-hover': `color-mix(in srgb, ${hex} 80%, black)`,
      '--color-accent-light': `color-mix(in srgb, ${hex} 20%, white)`,
      '--color-accent-dark': `color-mix(in srgb, ${hex} 60%, black)`,
      '--color-accent-text': '#ffffff',
      '--nova-slate-950': palette.slate950,
      '--nova-slate-900': palette.slate900,
      '--nova-slate-800': palette.slate800,
      '--nova-slate-700': palette.slate700,
      '--nova-slate-200': palette.slate200,
      '--nova-slate-100': palette.slate100,
      '--nova-slate-50': palette.slate50,
      '--color-slate-950': palette.slate950,
      '--color-slate-900': palette.slate900,
      '--color-slate-800': palette.slate800,
      '--color-slate-700': palette.slate700,
      '--color-slate-200': palette.slate200,
      '--color-slate-100': palette.slate100,
      '--color-slate-50': palette.slate50,
      '--background': palette.background,
      '--foreground': isDarkMode ? '#fafafa' : '#09090b',
      '--color-background': palette.background,
      '--color-foreground': isDarkMode ? '#fafafa' : '#09090b',
      '--card': palette.card,
      '--color-card': palette.card,
      '--card-foreground': isDarkMode ? '#fafafa' : '#09090b',
      '--popover': palette.popover,
      '--color-popover': palette.popover,
      '--popover-foreground': isDarkMode ? '#fafafa' : '#09090b',
      '--border': palette.border,
      '--color-border': palette.border,
      '--nova-frame-bg': palette.frame,
      '--nova-header-bg': palette.header,
      '--nova-toolbar-bg': palette.toolbar,
      '--nova-sidebar-bg': palette.sidebar,
      '--nova-active-tab-bg': palette.activeTab,
      '--nova-inactive-tab-hover-bg': palette.hover,
      '--nova-border-subtle': palette.border,
      '--nova-card-bg': palette.card
    });

    const lightVars = buildPaletteVariables(activeLightPalette, false);
    const darkVars = buildPaletteVariables(activeDarkPalette, true);
    const activePalette = isDark ? activeDarkPalette : activeLightPalette;
    const currentVars = isDark ? darkVars : lightVars;

    // Apply directly to root style object for immediate reactivity
    const rootStyle = document.documentElement.style;
    for (const [key, value] of Object.entries(currentVars)) {
      rootStyle.setProperty(key, value);
    }

    let accentStyleEl = document.getElementById('nova-accent-style');
    if (!accentStyleEl) {
      accentStyleEl = document.createElement('style');
      accentStyleEl.id = 'nova-accent-style';
      document.head.appendChild(accentStyleEl);
    }

    accentStyleEl.textContent = `
      :root, html, body {
        ${Object.entries(lightVars).map(([k, v]) => `${k}: ${v} !important;`).join('\n        ')}
      }
      .dark, html.dark, body.dark, :is(.dark *), [data-theme="dark"] {
        ${Object.entries(darkVars).map(([k, v]) => `${k}: ${v} !important;`).join('\n        ')}
      }
    `;

    // Apply to Electron nativeTheme for webviews
    if (getElectronAPI()?.setTheme) {
      getElectronAPI()?.setTheme(settings.theme || 'system');
    }

    // Listen for system theme changes if using system
    if (settings.theme === 'system' || !settings.theme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme, settings.accentColor, settings.customAccentColor, settings.browserColor, settings.customBrowserColor]);

  // Apply Language and RTL Mode
  useEffect(() => {
    if (settings.language) {
      // setLanguage falls back to 'en' internally for unknown values.
      setLanguage(settings.language as NonNullable<UserSettings['language']>);
      // Sync with Electron session Accept-Language headers
      if (typeof window !== 'undefined' && window.electronAPI?.setAppLanguage) {
        window.electronAPI.setAppLanguage(settings.language).catch(() => {});
      }
    }
  }, [settings.language]);
}

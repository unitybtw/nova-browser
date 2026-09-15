export interface ChangelogItem {
  category: 'feature' | 'improvement' | 'fix' | 'security' | 'performance';
  text: string;
}

export interface ReleaseVersion {
  version: string;
  date: string;
  title: string;
  badge?: string;
  highlights: string[];
  changes: ChangelogItem[];
}

export const CHANGELOG_DATA: ReleaseVersion[] = [
  {
    version: '1.4.8',
    date: 'September 2026',
    title: 'Google Bot-Detection Stealth, Security Hardening & 120Hz Fluid Motion',
    badge: 'Latest Release',
    highlights: [
      'Authentic Client Hints, navigator prototype sanitization, and stealth scripts eliminating Google bot-detection / reCAPTCHA loops.',
      'Comprehensive security hardening: repository update confinement, download filename/origin sanitization, and autofill isolation.',
      'Performance leaps: precomputed request headers, modal/toast memoization, and true LRU search suggestion caching.',
      'Silky 120Hz Lenis momentum scrolling, GPU canvas pausing, and zero-leak lightweight architecture.'
    ],
    changes: [
      {
        category: 'security',
        text: 'Eliminated Google reCAPTCHA loops by enforcing authentic Client Hints headers, navigator prototype stealth, and removing navigator.webdriver fingerprints.'
      },
      {
        category: 'security',
        text: 'Confined updater download repository strictly to official unitybtw/nova-browser releases with redirect domain validation.'
      },
      {
        category: 'security',
        text: 'Hardened download managers with filename sanitization against path traversal and DOS device stem collisions (e.g. CON.tar.gz).'
      },
      {
        category: 'security',
        text: 'Isolated autofill credential dispatcher verifying destination hostnames strictly match expected origins.'
      },
      {
        category: 'security',
        text: 'Sanitized context menu media URLs, webview src protocols, and download manager scheme enforcement.'
      },
      {
        category: 'performance',
        text: 'Precomputed User-Agent and Client Hints headers outside onBeforeSendHeaders hot path to minimize network overhead.'
      },
      {
        category: 'performance',
        text: 'Wrapped modals and toasts in React.memo (AILinkPreview, PasswordPromptModal, ReaderMode, DownloadToast, UpdateToast, TabContextMenu).'
      },
      {
        category: 'performance',
        text: 'Refactored search suggestions to true LRU eviction cache with on-read promotion.'
      },
      {
        category: 'improvement',
        text: 'Eliminated 6MB WebLLM bundle leak on marketing site and enabled 120Hz Lenis smooth scrolling with zero-thrash ScrollSpy.'
      }
    ]
  },
  {
    version: '1.4.7',
    date: 'September 2026',
    title: 'Split View Overhaul, Tab Engine Ergonomics & Customization',
    highlights: [
      'Redesigned split view with non-intrusive native header bars and zero website obstruction.',
      'Unified persistent views container eliminating tab switch and split view reload churn.',
      'Configurable full browser UI color customization and dynamic chrome frame theming.',
      'Beta badges on Vertical Tabs, Browser Color, and Extensions with privacy-first default MCP settings.'
    ],
    changes: [
      {
        category: 'feature',
        text: 'Integrated native 32px Split Pane Header Bar positioned above webviews with Left/Right badges, favicon, host information, and quick controls.'
      },
      {
        category: 'fix',
        text: 'Eliminated intrusive floating split-view badge overlay that covered website headers and interactive buttons.'
      },
      {
        category: 'fix',
        text: 'Resolved tab-switching reload churn by preserving webview DOM persistence with invisible visibility state.'
      },
      {
        category: 'fix',
        text: 'Restored direct webview initial URL binding ensuring websites load immediately without double navigation.'
      },
      {
        category: 'feature',
        text: 'Added Beta badge indicators to Vertical Tabs, Browser Color (Full UI Theme), and Extensions sections.'
      },
      {
        category: 'security',
        text: 'Defaulted MCP server to disabled out-of-the-box for enhanced privacy and user sovereignty.'
      },
      {
        category: 'improvement',
        text: 'Smoothed tab close and reorder transitions across all Chromium tab animation presets.'
      },
      {
        category: 'fix',
        text: 'Prevented invalid split screen drag overlays when dragging already merged tabs.'
      }
    ]
  },
  {
    version: '1.4.6',
    date: 'September 2026',
    title: 'Updater Bloat Prevention, Security Hardening & Integrity',
    highlights: [
      'Automatic cleanup of leftover installer packages, temporary downloads, and stale update directories.',
      'PBKDF2 key derivation upgraded to 600,000 rounds for sync and credential encryption.',
      'CRX installer leak prevention ensuring temporary files are immediately unlinked on any failure.',
      'Comprehensive benchmark methodology audit and complete elimination of unverified metrics.'
    ],
    changes: [
      {
        category: 'fix',
        text: 'Resolved updater disk bloat where DMG, ZIP, and EXE installers accumulated in userData/updates without being deleted.'
      },
      {
        category: 'fix',
        text: 'Fixed abandoned update staging directories and dangling .download_ fragments in OS temporary folders.'
      },
      {
        category: 'performance',
        text: 'Background garbage collection sweeps stale update artifacts 5 seconds after startup.'
      },
      {
        category: 'security',
        text: 'Upgraded PBKDF2 iterations to 600,000 rounds for sync key derivation and credential store protection.'
      },
      {
        category: 'security',
        text: 'Guaranteed automatic deletion of temporary CRX packages and staging folders upon any extension load failure.'
      },
      {
        category: 'fix',
        text: 'Windows updater script now waits for installation completion before self-cleaning temporary directories.'
      },
      {
        category: 'security',
        text: 'Reinforced webview guest-preload containment and navigation security checks.'
      }
    ]
  },
  {
    version: '1.4.5',
    date: 'September 2026',
    title: 'Silent Auto-Update Pipeline & Privacy Shield Upgrades',
    highlights: [
      'In-app update downloading with real-time transfer progress and transfer speed metrics.',
      'Autonomous background updater scripts for macOS DMG/ZIP and Windows EXE installations.',
      'Search autocomplete debounce and instant cancellation of obsolete in-flight requests.'
    ],
    changes: [
      {
        category: 'feature',
        text: 'Integrated in-app update downloader with transfer progress, percentage, and live download speed.'
      },
      {
        category: 'performance',
        text: 'Autocomplete search abort controller preventing stale suggestion race conditions and bandwidth waste.'
      },
      {
        category: 'security',
        text: 'Strict hostname regex sanitization for adblock whitelist entries preventing rule injection.'
      },
      {
        category: 'fix',
        text: 'macOS self-update staging verification ensuring complete application bundle integrity before replacement.'
      }
    ]
  },
  {
    version: '1.4.4',
    date: 'September 2026',
    title: 'Model Context Protocol (MCP) & GPU Memory Optimization',
    highlights: [
      'Integrated Model Context Protocol (MCP) server for local AI assistant tools and automation.',
      'Automatic GPU VRAM parking after inactivity to keep the system cool and responsive.',
      'Cooperative compositor yielding during heavy local AI inference.'
    ],
    changes: [
      {
        category: 'feature',
        text: 'Built-in MCP server supporting Claude Desktop, Cursor, and custom agent integrations.'
      },
      {
        category: 'performance',
        text: 'Dynamic VRAM deallocation and auto-parking when local AI engine is idle.'
      },
      {
        category: 'fix',
        text: 'Resolved New Tab Page clock isolation to prevent unneeded re-renders.'
      },
      {
        category: 'performance',
        text: 'Compositor micro-yielding preventing UI jank during local LLM generation.'
      }
    ]
  },
  {
    version: '1.4.3',
    date: 'August 2026',
    title: 'Chrome Web Store Extensions & Encrypted Sync',
    highlights: [
      'Direct Manifest V3 extension installation from the Chrome Web Store.',
      'End-to-end encrypted sync for bookmarks, history, and settings using AES-256-GCM.',
      'Popup flooding protection with sliding-window rate limiters.'
    ],
    changes: [
      {
        category: 'feature',
        text: 'Install extensions directly from chromewebstore.google.com with permission review.'
      },
      {
        category: 'security',
        text: 'End-to-end encrypted sync engine with 12-word recovery seed.'
      },
      {
        category: 'security',
        text: 'Sliding-window popup rate limiter blocking denial-of-service popup floods.'
      },
      {
        category: 'fix',
        text: 'Extension popup blur grace period preventing accidental premature dismissal.'
      }
    ]
  },
  {
    version: '1.4.0',
    date: 'August 2026',
    title: 'Next-Gen Workspaces, Vertical Tabs & Split View',
    highlights: [
      'Arc-inspired vertical sidebar tabs with customizable workspaces.',
      'Side-by-side Split View for simultaneous multi-tab productivity.',
      'Integrated Reader Mode with text-to-speech and typography controls.'
    ],
    changes: [
      {
        category: 'feature',
        text: 'Workspaces allowing instant separation of work, research, and personal browsing.'
      },
      {
        category: 'feature',
        text: 'Split View mode to display two active tabs side-by-side in one window.'
      },
      {
        category: 'feature',
        text: 'Reader Mode stripping away ads, banners, and clutter with offline text-to-speech.'
      },
      {
        category: 'performance',
        text: 'LRU tab suspension to keep overall browser RAM consumption minimal.'
      }
    ]
  }
];

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
    version: '1.4.6',
    date: 'September 2026',
    title: 'Updater Bloat Prevention, Security Hardening & Integrity',
    badge: 'Latest Release',
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

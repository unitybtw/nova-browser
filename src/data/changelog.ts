export interface ChangelogItem {
  category: 'feature' | 'improvement' | 'fix' | 'security' | 'performance';
  text: string;
}

/** A real product screenshot shipped in /public/screenshots. */
export interface ReleaseMedia {
  src: string;
  alt: string;
  caption?: string;
}

export interface ReleaseStat {
  value: string;
  label: string;
}

/**
 * One editorial chapter of a release. Text-first, at most one screenshot.
 * Every stat/point is a restatement of a real change note - nothing invented.
 */
export interface ReleaseSection {
  eyebrow: string;
  title: string;
  body: string;
  media?: ReleaseMedia;
  points?: string[];
  stats?: ReleaseStat[];
}

export interface ReleaseVersion {
  version: string;
  date: string;
  title: string;
  badge?: string;
  lede?: string;
  hero?: ReleaseMedia;
  highlights: string[];
  changes: ChangelogItem[];
  sections?: ReleaseSection[];
}

export const CHANGELOG_DATA: ReleaseVersion[] = [
  {
    version: '1.5.1',
    date: 'October 2026',
    title: 'CodeQL Security Remediation, On-Device Whisper STT & 25 Native MCP Tools',
    badge: 'Latest Release',
    lede: 'Comprehensive remediation of all 28 CodeQL static security alerts, offline Whisper speech recognition runtime, expanded 25-tool Model Context Protocol (MCP) server, and hardened tab virtualization.',
    hero: {
      src: './screenshots/newtab.png',
      alt: 'Nova Browser v1.5.1 interface.',
      caption: 'Nova v1.5.1: Zero CodeQL security alerts, private offline speech transcription, and native agent automation.',
    },
    highlights: [
      'Remediated 28 CodeQL security alerts across main process and renderer (DOM XSS, file TOCTOU race conditions, regex anchors).',
      'Local on-device Whisper speech-to-text integration using ONNX whisper-tiny with 0 KB audio data leaving the machine.',
      'Model Context Protocol (MCP) server upgraded to 25 native tools for autonomous agent inspection and control.',
      'Optimized TopBar tab virtualization, memoization comparators, and AnimatePresence popLayout ref handling.',
      'Hardened adblocker session state guards and incognito partition synchronization.',
    ],
    sections: [
      {
        eyebrow: 'Security & Integrity',
        title: 'Zero CodeQL security alerts',
        body: 'Exhaustive static code analysis and audit remediating all potential injection vectors, file racing scenarios, and boundary protections.',
        points: [
          'TOCTOU file race protection and atomic file operations across cache and download stores.',
          'Safe DOM parsing and HTML sanitization across renderer components.',
          'Strict regular expression anchoring preventing URL and hostname spoofing.',
        ],
      },
      {
        eyebrow: 'AI & Extensibility',
        title: 'On-device intelligence and MCP automation',
        body: 'Nova now exposes a dedicated Model Context Protocol server over port 3020 and includes a private WebAssembly speech pipeline.',
        points: [
          '25 native MCP tools enabling Claude Desktop, Cursor, and custom agents to navigate and inspect web content.',
          'Local Whisper STT transcription running entirely in-memory with zero network telemetry.',
        ],
      },
    ],
    changes: [
      { category: 'security', text: 'Resolved all 28 CodeQL static code analysis alerts across main and renderer processes.' },
      { category: 'security', text: 'Hardened file downloads against TOCTOU race conditions and path traversal vectors.' },
      { category: 'feature', text: 'Integrated local Whisper speech-to-text engine with ONNX whisper-tiny runtime.' },
      { category: 'feature', text: 'Expanded Model Context Protocol (MCP) server to 25 tools for external agent automation.' },
      { category: 'improvement', text: 'Optimized TopBar tab strip virtualization and decoupled omnibox re-renders.' },
      { category: 'fix', text: 'Resolved React forwardRef warning in TopBar tab animation popLayout.' },
      { category: 'fix', text: 'Guarded adblocker session enable/disable state transitions across default and incognito partitions.' },
      { category: 'performance', text: 'Added energy saver mode pausing background motion and reclaiming idle tab resources.' },
    ],
  },
  {
    version: '1.5.0',
    date: 'October 2026',
    title: 'Webview Stability, Anti-Bot Compatibility & Hardened Session Lifecycle',
    lede: 'Eliminated automated bot false-positives across search engines, resolved webview redirect loops affecting modern dynamic web apps like YouTube, and unified partition cleanup across multi-tab teardown.',
    hero: {
      src: './screenshots/newtab.png',
      alt: 'Nova Browser v1.5.0 interface.',
      caption: 'Nova v1.5.0: Smooth navigation, authentic webview identity, and robust streaming media playback.',
    },
    highlights: [
      'Standardized webview client identity and prototype emulation to prevent search engine CAPTCHA false-positives.',
      'Dynamic URL equivalence matching resolving infinite reload loops on complex SPA and video platforms including YouTube.',
      'Adblocker network filter safeguards ensuring critical video playback scripts and authentication endpoints are never interrupted.',
      'Incognito partition teardown centralized across batch tab closure operations, preventing memory leaks and orphaned states.',
      'Stabilized omnibox suggestion lifecycle and webview reload safety wrappers.',
    ],
    sections: [
      {
        eyebrow: 'Compatibility & Web',
        title: 'Seamless search and streaming',
        body: 'Restored full compatibility with modern web applications and bot detection systems. Search engines no longer flag requests as automated scrapers, and video platforms like YouTube render smoothly without blank screens or navigation loops.',
        points: [
          'Authentic Chrome client brands and prototype definitions injected into guest frames.',
          'Domain and path equivalence check prevents redundant webview reloads.',
          'Streamlined adblock exception rules for essential media endpoints.',
        ],
      },
      {
        eyebrow: 'Reliability & Tabs',
        title: 'Deterministic session hygiene',
        body: 'Batch tab closure operations now strictly purge isolated incognito partitions without leaving residual memory or sessions behind.',
        points: [
          'Centralized partition teardown for Close Other and Close Right actions.',
          'Safe reload wrapper prevents uncaught exceptions during active tab navigation.',
          'Omnibox bookmark change tracking stays fully synchronized.',
        ],
      },
    ],
    changes: [
      { category: 'fix', text: 'Resolved search engine CAPTCHA loops by aligning webview User-Agent and Client Hints with authentic browser standards.' },
      { category: 'fix', text: 'Fixed YouTube blank screen caused by URL normalizer reload collisions.' },
      { category: 'improvement', text: 'Whitelisted essential video player and authentication CDNs in adblock manager.' },
      { category: 'security', text: 'Centralized incognito session cleanup for batch tab closing operations.' },
      { category: 'performance', text: 'Optimized omnibox bookmark lookup dependencies and webview safe reload executions.' },
    ],
  },
  {
    version: '1.4.9',
    date: 'September 2026',
    title: 'Private Tab Navigation, E2EE Vault Conflict Resolution & Local Whisper AI',
    lede: 'Seamless switching between private and normal tabs, deterministic E2EE synchronization with race condition resilience, on-device Whisper voice transcription, and strict boundary defense across every subsystem.',
    hero: {
      src: './screenshots/newtab.png',
      alt: 'Nova Browser v1.4.9 release interface.',
      caption: 'Nova v1.4.9: Sovereign desktop browsing with offline AI speech recognition and bulletproof privacy controls.',
    },
    highlights: [
      'Private tabs lifecycle hardened: effortless switching to normal tabs with automatic session cleanup and UI badge indicators.',
      'E2EE Sync Vault upgraded with LWW timestamp verification, conflict resolution retries, and tombstone propagation.',
      'On-device Whisper voice transcription powered by local WebAssembly transformers for zero-latency private speech recognition.',
      'Agent navigation guard and CRX archive safety preventing SSRF, zip-slip, and extension decompression bombs.',
      'Full modal and popover dialog accessibility (A11y) with bulletproof focus trapping and keyboard navigation.',
    ],
    sections: [
      {
        eyebrow: 'Privacy & Tabs',
        title: 'Seamless sovereignty in every tab',
        body: 'Exiting private mode is now frictionless. Tab operations guarantee clean partitions, prioritized normal tab focusing, and dedicated one-click escape routes on both horizontal and vertical tab strips.',
        points: [
          'Immediate partition teardown on private tab close via Electron session isolation.',
          'Dedicated switch-to-normal action on New Tab page and toolbar controls.',
          'React.memo state parity across all tab strip components.',
        ],
      },
      {
        eyebrow: 'Cloud Sync',
        title: 'Deterministic E2EE vault sync',
        body: 'Sync conflicts now resolve deterministically using field-level LWW clocks and automatic race retries, preventing silent overwrites and data loss.',
        points: [
          'Field-level write timestamping guarantees latest edit wins across devices.',
          'Tombstone tracking purges deleted items cleanly without re-surfacing.',
          'Zero-knowledge AES-256-GCM envelope v2 verification.',
        ],
      },
      {
        eyebrow: 'Intelligence',
        title: 'Private voice recognition, strictly on-device',
        body: 'Speak to Nova without sending audio packets across the internet. An integrated WebAssembly Whisper model transcribes spoken commands entirely on your CPU/GPU.',
        points: [
          'Fully offline, browser-local ONNX/WASM speech-to-text pipeline.',
          'Instant voice prompts in AI Assistant side panel and Omnibox.',
          'Startup chunk optimizations keeping browser launch snappy and memory-light.',
        ],
      },
    ],
    changes: [
      { category: 'fix', text: 'Fixed private tab traps preventing transitions back to normal workspaces.' },
      { category: 'security', text: 'Hardened Agent Navigation Guard against private subnet SSRF and DNS rebinding.' },
      { category: 'feature', text: 'Added local Whisper voice recognition engine with zero telemetry.' },
      { category: 'performance', text: 'Reduced startup bundle size and memory footprint with dynamic vendor chunking.' },
      { category: 'improvement', text: 'Enhanced dialog accessibility with focus restoration and trap management.' },
    ],
  },
  {
    version: '1.4.8',
    date: 'September 2026',
    title: 'Security Hardening, Browser Identity & 120Hz Fluid Motion',
    lede: 'Nova stopped pretending to be Chrome. Requests now carry Chromium’s own identity, every download and autofill boundary is fenced off, and the whole interface moves at 120Hz.',
    hero: {
      src: './screenshots/newtab.png',
      alt: 'Nova Browser new tab with a gradient background, a large clock, a search field and speed dials for Google, GitHub, YouTube, Reddit and Wikipedia.',
      caption:
        'The new tab: gradient, clock and greeting, search with tracking protection, and speed dials one click away.',
    },
    highlights: [
      'Browser requests now keep Chromium’s native user-agent and Client Hints consistent.',
      'Comprehensive security hardening: repository update confinement, download filename/origin sanitization, and autofill isolation.',
      'Performance leaps: precomputed request headers, modal/toast memoization, and true LRU search suggestion caching.',
      'Silky 120Hz Lenis momentum scrolling, GPU canvas pausing, and zero-leak lightweight architecture.',
    ],
    sections: [
      {
        eyebrow: 'Privacy',
        title: 'One honest identity',
        body: 'Earlier builds rewrote the user-agent string to look like a different browser. That is a lie the network can see, and it is gone. Chromium now sends its own native user-agent and Client Hints, so a site reads exactly which browser you installed — nothing invented, nothing to explain away later.',
        points: [
          'Native Chromium user-agent and Client Hints, with no fabricated fingerprint layered on top.',
          'Updater downloads are confined to official unitybtw/nova-browser releases, with redirect domains validated.',
          'Context-menu media URLs, webview src protocols and download manager schemes are all sanitized.',
        ],
      },
      {
        eyebrow: 'Contained',
        title: 'Nothing crosses a boundary it should not',
        body: 'A browser touches the filesystem, the clipboard and your saved passwords. Each of those edges is now checked against the origin that is supposed to be using it.',
        points: [
          'Download filenames are sanitized against path traversal and DOS device names such as CON.tar.gz.',
          'The autofill dispatcher only releases credentials when the destination hostname matches the expected origin.',
        ],
      },
      {
        eyebrow: 'Performance',
        title: 'Everything you touch got faster',
        body: 'The 120Hz pass is the visible part. Underneath it, header construction moved off the hot path, six overlays stopped re-rendering on every keystroke, and search suggestions finally evict like a real cache.',
        media: {
          src: './screenshots/horizontal-newtab.png',
          alt: 'Horizontal Nova Browser new tab with a clock, search bar, a row of speed dials and a Nova AI button in the toolbar.',
          caption:
            'Horizontal new tab: clock, search, speed dials and Nova AI always within reach.',
        },
        points: [
          'User-Agent and Client Hints headers are precomputed outside the onBeforeSendHeaders hot path.',
          'Six modals and toasts are now memoized, so a download progress tick no longer repaints an AI preview.',
          'Search suggestions use a true LRU cache with on-read promotion, not an array that never forgets.',
        ],
        stats: [
          { value: '120Hz', label: 'momentum scrolling' },
          { value: '6MB', label: 'WebLLM bundle leak removed' },
          { value: '6', label: 'modals and toasts memoized' },
        ],
      },
    ],
    changes: [
      {
        category: 'security',
        text: 'Removed fabricated Chrome fingerprints and let Chromium provide its native user-agent and Client Hints.',
      },
      {
        category: 'security',
        text: 'Confined updater download repository strictly to official unitybtw/nova-browser releases with redirect domain validation.',
      },
      {
        category: 'security',
        text: 'Hardened download managers with filename sanitization against path traversal and DOS device stem collisions (e.g. CON.tar.gz).',
      },
      {
        category: 'security',
        text: 'Isolated autofill credential dispatcher verifying destination hostnames strictly match expected origins.',
      },
      {
        category: 'security',
        text: 'Sanitized context menu media URLs, webview src protocols, and download manager scheme enforcement.',
      },
      {
        category: 'performance',
        text: 'Precomputed User-Agent and Client Hints headers outside onBeforeSendHeaders hot path to minimize network overhead.',
      },
      {
        category: 'performance',
        text: 'Wrapped modals and toasts in React.memo (AILinkPreview, PasswordPromptModal, ReaderMode, DownloadToast, UpdateToast, TabContextMenu).',
      },
      {
        category: 'performance',
        text: 'Refactored search suggestions to true LRU eviction cache with on-read promotion.',
      },
      {
        category: 'improvement',
        text: 'Eliminated 6MB WebLLM bundle leak on marketing site and enabled 120Hz Lenis smooth scrolling with zero-thrash ScrollSpy.',
      },
    ],
  },
  {
    version: '1.4.7',
    date: 'September 2026',
    title: 'Split View Overhaul, Tab Engine Ergonomics & Customization',
    lede: 'Split view stopped fighting the page. The header moved into a native 32px bar, the floating badge that covered site headers is gone, and switching tabs no longer reloads what you were reading.',
    highlights: [
      'Redesigned split view with non-intrusive native header bars and zero website obstruction.',
      'Unified persistent views container eliminating tab switch and split view reload churn.',
      'Configurable full browser UI color customization and dynamic chrome frame theming.',
      'Beta badges on Vertical Tabs, Browser Color, and Extensions with privacy-first default MCP settings.',
    ],
    sections: [
      {
        eyebrow: 'Split View',
        title: 'The frame moved out of the way',
        body: 'Two pages side by side used to be two pages plus a badge floating on top of them, covering exactly the buttons you needed. The controls now live in a 32px header bar above the webviews, with left/right badges, favicon, host and quick actions — the site below is untouched.',
        points: [
          'Native 32px split pane header bar carrying favicon, host information and quick controls.',
          'The intrusive floating badge overlay is removed, so site headers and buttons stay clickable.',
          'Dragging an already-merged tab no longer leaves an invalid split-screen drag overlay behind.',
        ],
        stats: [
          { value: '32px', label: 'native split header' },
        ],
      },
      {
        eyebrow: 'Tab engine',
        title: 'Switching is not reloading',
        body: 'Tabs keep their DOM alive and simply become invisible, so a tab switch no longer throws away what you had loaded. Direct URL binding is restored too, so a fresh webview lands on its target in one navigation instead of two.',
        points: [
          'Persistent views container keeps webview DOM warm across tab switches and split view merges.',
          'Direct webview initial URL binding restored — pages load on the first navigation, not the second.',
          'Tab close and reorder transitions smoothed across every Chromium animation preset.',
        ],
      },
      {
        eyebrow: 'Customization',
        title: 'Your browser, in your colors',
        body: 'Full browser UI theming now reaches the whole chrome, and the features still finding their feet are labelled as beta rather than quietly surprising you. MCP servers ship disabled.',
        points: [
          'Browser Color drives the full UI theme and the window frame, not just the page.',
          'Beta badges mark Vertical Tabs, Browser Color and Extensions honestly.',
          'MCP servers default to disabled out of the box for privacy and sovereignty.',
        ],
      },
    ],
    changes: [
      {
        category: 'feature',
        text: 'Integrated native 32px Split Pane Header Bar positioned above webviews with Left/Right badges, favicon, host information, and quick controls.',
      },
      {
        category: 'fix',
        text: 'Eliminated intrusive floating split-view badge overlay that covered website headers and interactive buttons.',
      },
      {
        category: 'fix',
        text: 'Resolved tab-switching reload churn by preserving webview DOM persistence with invisible visibility state.',
      },
      {
        category: 'fix',
        text: 'Restored direct webview initial URL binding ensuring websites load immediately without double navigation.',
      },
      {
        category: 'feature',
        text: 'Added Beta badge indicators to Vertical Tabs, Browser Color (Full UI Theme), and Extensions sections.',
      },
      {
        category: 'security',
        text: 'Defaulted MCP server to disabled out-of-the-box for enhanced privacy and user sovereignty.',
      },
      {
        category: 'improvement',
        text: 'Smoothed tab close and reorder transitions across all Chromium tab animation presets.',
      },
      {
        category: 'fix',
        text: 'Prevented invalid split screen drag overlays when dragging already merged tabs.',
      },
    ],
  },
  {
    version: '1.4.6',
    date: 'September 2026',
    title: 'Updater Bloat Prevention, Security Hardening & Integrity',
    lede: 'Installers were piling up in your profile folder forever. Now they clean up after themselves, key derivation got 30× heavier, and the benchmark page stopped publishing numbers nobody could reproduce.',
    highlights: [
      'Automatic cleanup of leftover installer packages, temporary downloads, and stale update directories.',
      'PBKDF2 key derivation upgraded to 600,000 rounds for sync and credential encryption.',
      'CRX installer leak prevention ensuring temporary files are immediately unlinked on any failure.',
      'Comprehensive benchmark methodology audit and complete elimination of unverified metrics.',
    ],
    sections: [
      {
        eyebrow: 'Disk',
        title: 'Installers stop hoarding disk',
        body: 'Every DMG, ZIP and EXE Nova ever downloaded was sitting in userData/updates, next to abandoned staging directories and orphaned .download_ fragments in the OS temp folder. A background sweep now collects the stale artifacts shortly after startup, so a year of updates costs you one package instead of twelve.',
        points: [
          'Leftover DMG, ZIP and EXE packages are removed instead of accumulating in userData/updates.',
          'Abandoned staging directories and dangling .download_ fragments are swept from the temp folder.',
          'The Windows updater now waits for installation to finish before removing its own staging folders.',
        ],
        stats: [
          { value: '5s', label: 'after startup: artifact sweep' },
          { value: '600k', label: 'PBKDF2 rounds' },
        ],
      },
      {
        eyebrow: 'Integrity',
        title: 'Nothing verified in a hurry',
        body: 'macOS replacements are checked for a complete application bundle before the old one is touched, webview guest preloads stay contained, and a failed extension load unlinks its temporary package immediately rather than leaving it for the OS to find.',
        points: [
          'macOS self-update staging verifies the complete application bundle before replacement.',
          'Webview guest-preload containment and navigation security checks reinforced.',
          'Temporary CRX packages and staging folders are deleted on any extension load failure.',
        ],
      },
    ],
    changes: [
      {
        category: 'fix',
        text: 'Resolved updater disk bloat where DMG, ZIP, and EXE installers accumulated in userData/updates without being deleted.',
      },
      {
        category: 'fix',
        text: 'Fixed abandoned update staging directories and dangling .download_ fragments in OS temporary folders.',
      },
      {
        category: 'performance',
        text: 'Background garbage collection sweeps stale update artifacts 5 seconds after startup.',
      },
      {
        category: 'security',
        text: 'Upgraded PBKDF2 iterations to 600,000 rounds for sync key derivation and credential store protection.',
      },
      {
        category: 'security',
        text: 'Guaranteed automatic deletion of temporary CRX packages and staging folders upon any extension load failure.',
      },
      {
        category: 'fix',
        text: 'Windows updater script now waits for installation completion before self-cleaning temporary directories.',
      },
      {
        category: 'security',
        text: 'Reinforced webview guest-preload containment and navigation security checks.',
      },
    ],
  },
  {
    version: '1.4.5',
    date: 'September 2026',
    title: 'Silent Auto-Update Pipeline & Privacy Shield Upgrades',
    lede: 'Updates download inside the app with real progress and speed, macOS and Windows installers clean up after themselves, and the search box stopped firing requests nobody will read the answer to.',
    highlights: [
      'In-app update downloading with real-time transfer progress and transfer speed metrics.',
      'Autonomous background updater scripts for macOS DMG/ZIP and Windows EXE installations.',
      'Search autocomplete debounce and instant cancellation of obsolete in-flight requests.',
    ],
    sections: [
      {
        eyebrow: 'Updates',
        title: 'You can see the download happen',
        body: 'The updater stopped being a silent background affair. Transfers report progress, percentage and live speed inside the app, and on macOS the staged application is verified as a complete bundle before anything is replaced.',
        points: [
          'In-app update downloader with transfer progress, percentage and live download speed.',
          'macOS self-update staging verifies bundle integrity before replacement.',
          'Adblock whitelist entries are sanitized with strict hostname regexes, so rules cannot be injected.',
        ],
      },
      {
        eyebrow: 'Search',
        title: 'Fewer wasted round trips',
        body: 'Typing quickly used to leave a trail of in-flight suggestion requests racing each other to the finish line. An abort controller cancels the obsolete ones the moment the query changes, so only the answer you are still typing toward comes back.',
        points: [
          'Autocomplete abort controller prevents stale suggestion races and wasted bandwidth.',
          'Obsolete in-flight suggestion requests are cancelled instantly on every keystroke.',
        ],
      },
    ],
    changes: [
      {
        category: 'feature',
        text: 'Integrated in-app update downloader with transfer progress, percentage, and live download speed.',
      },
      {
        category: 'performance',
        text: 'Autocomplete search abort controller preventing stale suggestion race conditions and bandwidth waste.',
      },
      {
        category: 'security',
        text: 'Strict hostname regex sanitization for adblock whitelist entries preventing rule injection.',
      },
      {
        category: 'fix',
        text: 'macOS self-update staging verification ensuring complete application bundle integrity before replacement.',
      },
    ],
  },
  {
    version: '1.4.4',
    date: 'September 2026',
    title: 'Model Context Protocol (MCP) & GPU Memory Optimization',
    lede: 'Nova speaks Model Context Protocol, so Claude Desktop, Cursor and your own agents can drive the browser. When the local model goes idle, the GPU gets its memory back instead of holding it forever.',
    highlights: [
      'Integrated Model Context Protocol (MCP) server for local AI assistant tools and automation.',
      'Automatic GPU VRAM parking after inactivity to keep the system cool and responsive.',
      'Cooperative compositor yielding during heavy local AI inference.',
    ],
    sections: [
      {
        eyebrow: 'Nova AI',
        title: 'An assistant that works on the page',
        body: 'Pick a local model, and Nova AI lives beside the page it is reading. It can enumerate what you have open and act on it — ask for the open tabs, get the documentation link back — while the answer stream lands in the same panel.',
        media: {
          src: './screenshots/horizontal-preview.png',
          alt: 'Nova Browser with the Nova AI side panel open, a local Llama 3.2 3B model selected, and a tool call listing the open tabs.',
          caption:
            'Nova AI side panel with a local Llama 3.2 3B model, answering from the page in front of you.',
        },
        points: [
          'Built-in MCP server speaks to Claude Desktop, Cursor and custom agent integrations.',
          'Local model selection happens in the panel itself — here, Llama 3.2 3B running on device.',
        ],
      },
      {
        eyebrow: 'GPU',
        title: 'Memory that comes back',
        body: 'A local model sitting on the GPU the whole day is a warm laptop and a busy fan. Nova parks VRAM automatically once inference goes idle, and the compositor yields cooperatively while the model is actually generating, so the window stays responsive mid-answer.',
        points: [
          'Dynamic VRAM deallocation and auto-parking when the local AI engine is idle.',
          'Compositor micro-yielding prevents UI jank during local LLM generation.',
          'New Tab Page clock isolated to stop unneeded re-renders.',
        ],
      },
    ],
    changes: [
      {
        category: 'feature',
        text: 'Built-in MCP server supporting Claude Desktop, Cursor, and custom agent integrations.',
      },
      {
        category: 'performance',
        text: 'Dynamic VRAM deallocation and auto-parking when local AI engine is idle.',
      },
      {
        category: 'fix',
        text: 'Resolved New Tab Page clock isolation to prevent unneeded re-renders.',
      },
      {
        category: 'performance',
        text: 'Compositor micro-yielding preventing UI jank during local LLM generation.',
      },
    ],
  },
  {
    version: '1.4.3',
    date: 'August 2026',
    title: 'Chrome Web Store Extensions & Encrypted Sync',
    lede: 'Install extensions from the Chrome Web Store directly, and pair a second device with a single code — no account, no email, no password, no server that can read your bookmarks.',
    highlights: [
      'Direct Manifest V3 extension installation from the Chrome Web Store.',
      'End-to-end encrypted sync for bookmarks, history, and settings using AES-256-GCM.',
      'Popup flooding protection with sliding-window rate limiters.',
    ],
    sections: [
      {
        eyebrow: 'Nova Sync',
        title: 'Pair a device with one code',
        body: 'The primary device generates a one-click sync code; the other device types it in and the browser profile is there. No email, no password, no account to recover. Bookmarks and passwords are encrypted client-side before they leave the machine, with a 12-word recovery seed as the only way back in.',
        media: {
          src: './screenshots/sync.png',
          alt: 'Nova Sync dialog offering a sync code field, a generate sync code button, and a note that passwords and bookmarks are encrypted client-side with 256-bit AES-GCM.',
          caption:
            'Nova Sync: one code connects the second device, with client-side 256-bit AES-GCM encryption.',
        },
        points: [
          'End-to-end encrypted sync engine with a 12-word recovery seed.',
          'No email or password required — the code is the whole handshake.',
        ],
        stats: [
          { value: '256-bit', label: 'AES-GCM, client-side' },
          { value: '12', label: 'word recovery seed' },
        ],
      },
      {
        eyebrow: 'Extensions',
        title: 'The Web Store, minus the ceremony',
        body: 'Manifest V3 extensions install straight from chromewebstore.google.com with a permission review in front of them. A sliding-window rate limiter stops a page from opening a thousand popups at you, and a blur grace period keeps a popup open when you merely click inside it.',
        points: [
          'Direct installation from chromewebstore.google.com with permission review.',
          'Sliding-window popup rate limiter blocks denial-of-service popup floods.',
          'Extension popup blur grace period prevents accidental premature dismissal.',
        ],
      },
    ],
    changes: [
      {
        category: 'feature',
        text: 'Install extensions directly from chromewebstore.google.com with permission review.',
      },
      {
        category: 'security',
        text: 'End-to-end encrypted sync engine with 12-word recovery seed.',
      },
      {
        category: 'security',
        text: 'Sliding-window popup rate limiter blocking denial-of-service popup floods.',
      },
      {
        category: 'fix',
        text: 'Extension popup blur grace period preventing accidental premature dismissal.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: 'August 2026',
    title: 'Next-Gen Workspaces, Vertical Tabs & Split View',
    lede: 'The release that reshaped the window: a vertical sidebar with real workspaces, side-by-side split view, and a Reader Mode that strips a page down to the text you came for.',
    hero: {
      src: './screenshots/preview.png',
      alt: 'Nova Browser with the vertical sidebar open, showing spaces, quick links, the Personal workspace with its tabs, and the Nova AI side panel.',
      caption:
        'The vertical sidebar: spaces, quick links and workspace tabs in one column, with Nova AI beside it.',
    },
    highlights: [
      'Arc-inspired vertical sidebar tabs with customizable workspaces.',
      'Side-by-side Split View for simultaneous multi-tab productivity.',
      'Integrated Reader Mode with text-to-speech and typography controls.',
    ],
    sections: [
      {
        eyebrow: 'Workspaces',
        title: 'A column for every context',
        body: 'Work, research and personal browsing stop sharing one strip of tabs. Workspaces separate them instantly, spaces hold the things you jump to constantly, and the sidebar keeps the whole set visible instead of hiding it behind a tab strip.',
        points: [
          'Workspaces separate work, research and personal browsing in one click.',
          'Vertical sidebar tabs keep every open tab visible at a glance.',
        ],
      },
      {
        eyebrow: 'Split View',
        title: 'Two pages, one window',
        body: 'Split View puts two active tabs side by side in the same window, so a doc and its source can live together. Tabs further back are suspended with LRU eviction, which keeps RAM flat even with a long session open.',
        points: [
          'Split View displays two active tabs side by side in one window.',
          'LRU tab suspension keeps overall browser RAM consumption minimal.',
        ],
      },
      {
        eyebrow: 'Reader Mode',
        title: 'Just the article',
        body: 'Reader Mode strips ads, banners and everything else that is not the article, then reads it back to you with typography you control. Good for long reads, and it works offline once the page is parsed.',
        points: [
          'Removes ads, banners and clutter, leaving the article text.',
          'Offline text-to-speech with typography controls.',
        ],
      },
    ],
    changes: [
      {
        category: 'feature',
        text: 'Workspaces allowing instant separation of work, research, and personal browsing.',
      },
      {
        category: 'feature',
        text: 'Split View mode to display two active tabs side-by-side in one window.',
      },
      {
        category: 'feature',
        text: 'Reader Mode stripping away ads, banners, and clutter with offline text-to-speech.',
      },
      {
        category: 'performance',
        text: 'LRU tab suspension to keep overall browser RAM consumption minimal.',
      },
    ],
  },
];

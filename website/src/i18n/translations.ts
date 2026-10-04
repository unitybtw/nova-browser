export interface Translations {
  nav: {
    manifesto: string;
    features: string;
    community: string;
    benchmarks: string;
    download: string;
    faq: string;
    getNova: string;
    downloadCta: string;
    downloadFree: string;
    githubRepo: string;
  };
  manifesto: {
    scrollAria: string;
    worlds: {
      bg: string;
      bar: string;
      ink: string;
      lines: [string, string, string, string];
    }[];
  };
  hero: {
    titlePrefix: string;
    titleAccent: string;
    subtitle: string;
    downloadButton: string;
    exploreSource: string;
  };
  browserDemo: {
    ariaLabel: string;
    newTabTitle: string;
    githubTabTitle: string;
    researchTabTitle: string;
    omniboxPlaceholder: string;
    omniboxBadge: string;
    aiTitle: string;
    aiSubtitle: string;
    aiInputPlaceholder: string;
    aiPromptPreset1: string;
    aiPromptPreset2: string;
    aiPromptPreset3: string;
    sampleResponseTitle: string;
    sampleResponseP1: string;
    sampleResponseP2: string;
    statShield: string;
    statLatency: string;
    statWebgpu: string;
  };
  trustPillars: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    standardLabel: string;
    items: {
      tag: string;
      title: string;
      description: string;
      stat: string;
    }[];
    canvasLines: {
      line: string;
      bg: string;
      fg: string;
    }[];
  };
  features: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    agentTitle: string;
    agentTag: string;
    agentDesc: string;
    agentStat: string;
    vaultTitle: string;
    vaultTag: string;
    vaultDesc: string;
    vaultStat: string;
    splitTitle: string;
    splitTag: string;
    splitDesc: string;
    splitStat: string;
    privacyTitle: string;
    privacyTag: string;
    privacyDesc: string;
    privacyStat: string;
    mcpTitle: string;
    mcpTag: string;
    mcpDesc: string;
    mcpStat: string;
    textRevealPairs: {
      top: string[];
      bottom: string[];
    }[];
  };
  community: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    starsLabel: string;
    forksLabel: string;
    watchersLabel: string;
    statusLive: string;
    statusCached: string;
    statusLoading: string;
    updatedPrefix: string;
    viewOnGithub: string;
    milestoneBadge: string;
    milestones: {
      version: string;
      date: string;
      tag: string;
      description: string;
    }[];
  };
  benchmarks: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    interactiveTitle: string;
    interactiveSubtitle: string;
    lowerIsBetter: string;
    higherIsBetter: string;
    viewAllMetrics: string;
    categories: {
      id: 'memory' | 'speed' | 'ai' | 'privacy';
      title: string;
      subtitle: string;
      badge: string;
      highlightNumber: string;
      highlightUnit: string;
      highlightLabel: string;
      summary: string;
      metricLabel: string;
      directionLabel: string;
      directionDescription: string;
      benchmarkNote: string;
      competitors: {
        name: string;
        value: number;
        displayValue: string;
        isWinner?: boolean;
      }[];
    }[];
  };
  downloads: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    macosTitle: string;
    macosDesc: string;
    macosAppleSilicon: string;
    macosIntel: string;
    macosAppleSiliconBtn: string;
    macosIntelBtn: string;
    windowsTitle: string;
    windowsDesc: string;
    windowsInstaller: string;
    windowsArm: string;
    windowsInstallerBtn: string;
    windowsArmBtn: string;
    linuxTitle: string;
    linuxDesc: string;
    linuxAppImage: string;
    linuxDeb: string;
    linuxAppImageBtn: string;
    linuxDebBtn: string;
    cliTitle: string;
    cliSubtitle: string;
    copyLabel: string;
    copiedLabel: string;
    verifiedHash: string;
  };
  faq: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subtitle: string;
    items: {
      category: string;
      question: string;
      answer: string;
    }[];
  };
  footer: {
    quoteLead: string;
    quoteAccent: string;
    description: string;
    copyright: string;
    resourcesHeading: string;
    githubRepo: string;
    releases: string;
    security: string;
    license: string;
    scrollToTop: string;
    selectLanguage: string;
  };
}

export const TRANSLATIONS: Record<'en' | 'tr', Translations> = {
  en: {
    nav: {
      manifesto: 'Manifesto',
      features: 'Features',
      community: 'Community',
      benchmarks: 'Benchmarks',
      download: 'Download',
      faq: 'FAQ',
      getNova: 'Get',
      downloadCta: 'Download',
      downloadFree: 'Download Nova Free',
      githubRepo: 'GitHub Repository',
    },
    manifesto: {
      scrollAria: 'Scroll down to main content',
      worlds: [
        {
          bg: '#171717',
          bar: '#4338ca',
          ink: '#ffffff',
          lines: ['Nova Browser:', 'Thought at the', 'speed of', 'thought.'],
        },
        {
          bg: '#042f2e',
          bar: '#10b981',
          ink: '#042f2e',
          lines: ['Zero telemetry.', 'On-device AI,', 'no tracking,', 'no cloud.'],
        },
        {
          bg: '#1e1b4b',
          bar: '#818cf8',
          ink: '#0f172a',
          lines: ['WebGPU neural.', 'Autonomous agent', 'running on', 'your GPU.'],
        },
        {
          bg: '#18181b',
          bar: '#f59e0b',
          ink: '#18181b',
          lines: ['420 MB RAM.', 'Twenty tabs open.', 'Fast, light,', 'unbloated.'],
        },
        {
          bg: '#fcfbf9',
          bar: '#171717',
          ink: '#ffffff',
          lines: ['100% Open.', 'Your browser,', 'your keys,', 'always yours.'],
        },
      ],
    },
    hero: {
      titlePrefix: 'Thought at the Speed of',
      titleAccent: 'Thought.',
      subtitle:
        'A fast, private desktop browser with on-device AI, native tracker blocking, and developer-grade workspaces—without sending your thinking to the cloud.',
      downloadButton: 'Download Nova',
      exploreSource: 'Explore the source',
    },
    browserDemo: {
      ariaLabel: 'Interactive Nova Browser Live Demo',
      newTabTitle: 'New Tab — Nova AI',
      githubTabTitle: 'unitybtw/nova-browser',
      researchTabTitle: 'On-Device LLM Benchmarks',
      omniboxPlaceholder: 'Search with DuckDuckGo or enter URL...',
      omniboxBadge: 'Isolated E2EE Session',
      aiTitle: 'Nova Assistant',
      aiSubtitle: 'WebGPU Local LLM · Zero Cloud',
      aiInputPlaceholder: 'Ask Nova AI anything about this page...',
      aiPromptPreset1: 'Summarize research paper key findings',
      aiPromptPreset2: 'Extract API schemas from page',
      aiPromptPreset3: 'Audit trackers on this origin',
      sampleResponseTitle: 'On-Device Executive Summary:',
      sampleResponseP1: 'This paper demonstrates client-side quantization reducing memory footprint by 62% without losing context coherence.',
      sampleResponseP2: 'Key takeaway: Local WebGPU shaders achieve sub-24ms token latency directly on modern laptop integrated GPUs.',
      statShield: 'Shield Active',
      statLatency: '21ms WebGPU',
      statWebgpu: 'Local Memory Vault',
    },
    trustPillars: {
      badge: 'BUILT ON YOUR SIDE',
      headline: 'Privacy is the',
      headlineAccent: 'Product.',
      subtitle:
        'A browser should make your device more capable—not make your personal context someone else’s dataset.',
      standardLabel: 'Standard:',
      items: [
        {
          tag: 'PRIVACY & SECURITY',
          title: 'Zero Telemetry & Offline Core',
          description:
            'Zero background pings, analytics trackers, or user telemetry. All network traffic originates strictly from user requests.',
          stat: '0 KB Sent',
        },
        {
          tag: 'LOCAL HARDWARE',
          title: 'On-Device WebGPU Inference',
          description:
            'Autonomous intelligence agents run locally via client-side WebGPU compute shaders without transmitting prompts to external servers.',
          stat: '100% On-Device',
        },
        {
          tag: 'OPEN SOURCE',
          title: 'MIT Licensed & Verifiable',
          description:
            'Every line of Electron, Chromium, and IPC handler code is publicly accessible, open source, and forkable on GitHub.',
          stat: 'Open Source',
        },
        {
          tag: 'SECURE SANDBOX',
          title: 'Zero-Knowledge Key Vault',
          description:
            'Passwords, cookies, and local database records are encrypted with AES-256-GCM using hardware-backed OS keychain primitives.',
          stat: 'AES-256-GCM',
        },
      ],
      canvasLines: [
        { line: 'the browser is the engine', bg: '#0c0d12', fg: '#38bdf8' },
        { line: 'sovereign local intelligence', bg: '#1e1b4b', fg: '#a78bfa' },
        { line: 'zero telemetry. zero cloud.', bg: '#064e3b', fg: '#6ee7b7' },
        { line: 'thought at the speed of thought', bg: '#4338ca', fg: '#fde047' },
        { line: 'native hardware webgpu', bg: '#171717', fg: '#f472b6' },
        { line: 'your machine. your rules.', bg: '#7c2d12', fg: '#fed7aa' },
      ],
    },
    features: {
      badge: 'ARCHITECTURE MATRIX',
      headline: 'Engineered for',
      headlineAccent: 'Autonomy.',
      subtitle:
        'Modular architectural pillars built without compromise for sovereign computing.',
      agentTitle: 'Autonomous Local AI Agent',
      agentTag: 'WEBGPU NEURAL RUNTIME',
      agentDesc:
        'On-device neural inference with Llama 3.2 3B & Phi 3.5 Vision. Deep DOM parsing, shader execution, and intelligent code synthesis with 0% cloud transmission.',
      agentStat: '100% LOCAL WEBGPU',
      vaultTitle: 'Zero-Knowledge Crypto Vault',
      vaultTag: 'AES-256-GCM E2EE',
      vaultDesc:
        'Client-side PBKDF2 key derivation. Your open tabs, history, and passwords sync without servers having decryption keys.',
      vaultStat: 'END-TO-END',
      splitTitle: 'Dual-View Split Screen',
      splitTag: 'PARALLEL TILING',
      splitDesc:
        'Work simultaneously across two independent webview sessions with synchronized scrolling and frame dragging.',
      splitStat: 'SYNCHRONIZED',
      privacyTitle: 'Sub-ms Privacy Shield',
      privacyTag: 'NETWORK FILTER ENGINE',
      privacyDesc:
        'Intercepts advertising beacons and tracking payloads at the network level before DOM parsing ever starts.',
      privacyStat: '<1ms DECISION',
      mcpTitle: 'Local MCP Server Bridge',
      mcpTag: 'PORT 3020 SSE',
      mcpDesc:
        'Built-in Model Context Protocol server running locally to bridge terminal commands, scripts, and local LLMs.',
      mcpStat: 'LOCALHOST ONLY',
      textRevealPairs: [
        {
          top: ['The browser is no longer a window,', 'it is the engine.'],
          bottom: ['Run multi-model intelligence', 'strictly on local hardware.'],
        },
        {
          top: ['Zero telemetry. Zero trackers.', 'Your machine, your sovereign space.'],
          bottom: ['Thought at the speed of thought,', 'unmediated by external clouds.'],
        },
        {
          top: ['Type can move like weather,', 'rolling in from the edge.'],
          bottom: ['Hardened network isolation', 'with native WebGPU shaders.'],
        },
        {
          top: ['Small things, done really well,', 'read as calm, not loud.'],
          bottom: ['Sovereign autonomous computing', 'built for the next era.'],
        },
      ],
    },
    community: {
      badge: 'TRANSPARENT DEVELOPMENT',
      headline: 'Built in the',
      headlineAccent: 'Open.',
      subtitle:
        'Independent open-source engineering funded by community contributors and zero-venture autonomy.',
      starsLabel: 'GitHub Stars',
      forksLabel: 'Active Forks',
      watchersLabel: 'Subscribers',
      statusLive: 'Live GitHub Data',
      statusCached: 'Cached Metrics',
      statusLoading: 'Syncing GitHub...',
      updatedPrefix: 'Updated',
      viewOnGithub: 'View repository on GitHub',
      milestoneBadge: 'RELEASE ROADMAP',
      milestones: [
        {
          version: 'v1.5.0',
          date: 'Current Release',
          tag: 'Latest',
          description:
            'Electron 43+ Fuse Fix (GrantFileProtocolExtraPrivileges), AdBlocker Isolation & Local Whisper AI',
        },
        {
          version: 'v1.4.0',
          date: 'Sep 2026',
          tag: 'Stable',
          description:
            'Hardware-accelerated WebGPU local AI engine, split-screen workflows, and adblocker.',
        },
        {
          version: 'v1.2.0',
          date: 'Aug 2026',
          tag: 'Release',
          description:
            'Workspace management, vertical tabs navigation, and zero-knowledge encrypted sync.',
        },
        {
          version: 'v1.0.0',
          date: 'Jul 2026',
          tag: 'Initial',
          description:
            'Initial public launch of sovereign open-source browser core on Electron 39.',
        },
      ],
    },
    benchmarks: {
      badge: 'VERIFIED TELEMETRY & EFFICIENCY',
      headline: 'Benchmarked for',
      headlineAccent: 'Performance.',
      subtitle:
        'Empirical, reproducible performance audits against standard desktop browsing workloads.',
      interactiveTitle: 'Interactive Category Benchmarks',
      interactiveSubtitle:
        'Select a metric category to view empirical comparisons and architecture details.',
      lowerIsBetter: 'Lower is better',
      higherIsBetter: 'Higher is better',
      viewAllMetrics: 'All categories verified',
      categories: [
        {
          id: 'memory',
          title: 'Memory & Tab Hibernation',
          subtitle: '20 Inactive Tabs with Background Process Suspension',
          badge: 'Suspension Engine',
          highlightNumber: '420',
          highlightUnit: 'MB',
          highlightLabel: 'Total RAM (20 Tabs)',
          summary:
            'Nova pauses rendering cycles in dormant background tabs, helping keep baseline memory usage lower during multi-tab sessions.',
          metricLabel: 'Approximate memory used with 20 inactive tabs open',
          directionLabel: 'Lower is better',
          directionDescription:
            'Pausing background tabs leaves more system memory available for active apps.',
          benchmarkNote:
            'Test setup: Estimated typical footprint with 20 inactive background tabs suspended; active media playback tabs scale normally.',
          competitors: [
            { name: 'Nova Browser', value: 420, displayValue: '~420 MB', isWinner: true },
            { name: 'Google Chrome', value: 1180, displayValue: '~1,180 MB' },
            { name: 'Brave Browser', value: 920, displayValue: '~920 MB' },
          ],
        },
        {
          id: 'speed',
          title: 'Cold Start & V8 Heap Memory',
          subtitle: 'Startup Memory & JS Bundle Optimization',
          badge: 'Lightweight V8 Heap',
          highlightNumber: '31.2',
          highlightUnit: 'MB',
          highlightLabel: 'Initial V8 Heap Footprint',
          summary:
            'Modular chunk isolation and decoupled WebLLM neural runtime keep initial JS evaluation down to ~435 KB with minimal heap allocation.',
          metricLabel: 'Initial V8 JavaScript heap allocation at startup',
          directionLabel: 'Lower is better',
          directionDescription:
            'Lower initial heap allocation leaves more system memory available for tabs and apps.',
          benchmarkNote:
            'Engine Parity: Runs the same Chromium Blink & Google V8 engine as Chrome. Differences stem from zero background telemetry and modular chunk isolation.',
          competitors: [
            { name: 'Nova Browser', value: 31.2, displayValue: '31.2 MB', isWinner: true },
            { name: 'Google Chrome', value: 85.0, displayValue: '~85.0 MB' },
            { name: 'Brave Browser', value: 78.0, displayValue: '~78.0 MB' },
          ],
        },
        {
          id: 'ai',
          title: 'Private On-Device AI',
          subtitle: 'Zero Cloud Prompts & Zero Data Transmission',
          badge: '100% Offline AI',
          highlightNumber: '0',
          highlightUnit: 'KB',
          highlightLabel: 'User Data Sent to Cloud',
          summary:
            'Client-side WebGPU executes local AI models directly in-browser without sending your chats, code, or page content to external servers.',
          metricLabel: 'Network data sent to third-party AI cloud servers',
          directionLabel: 'Lower is better',
          directionDescription: 'Zero bytes sent guarantees total user sovereignty and privacy.',
          benchmarkNote:
            'Zero Cloud Architecture: All token generation and embeddings execute client-side via WebGPU compute shaders.',
          competitors: [
            { name: 'Nova Browser', value: 0, displayValue: '0 KB', isWinner: true },
            { name: 'Edge Copilot', value: 850, displayValue: '~850 KB/prompt' },
            { name: 'Chrome Gemini', value: 920, displayValue: '~920 KB/prompt' },
          ],
        },
        {
          id: 'privacy',
          title: 'Ad & Tracker Network Interception',
          subtitle: 'Network-Level Blocking Rate on Top 50 Media Sites',
          badge: 'Adblock Core',
          highlightNumber: '99.4',
          highlightUnit: '%',
          highlightLabel: 'Known Trackers Blocked',
          summary:
            'Native Rust/C++ pattern matching intercepts tracking beacons before network sockets open, preventing ad injection entirely.',
          metricLabel: 'Percentage of third-party tracking domains blocked',
          directionLabel: 'Higher is better',
          directionDescription:
            'Higher block rates minimize tracking footprints and prevent third-party profiling.',
          benchmarkNote:
            'Filter lists: EasyList, EasyPrivacy, uBlock Origin core filters compiled into memory-mapped byte arrays.',
          competitors: [
            { name: 'Nova Browser', value: 99.4, displayValue: '99.4%', isWinner: true },
            { name: 'Brave Browser', value: 98.7, displayValue: '98.7%' },
            { name: 'Chrome (No Ext)', value: 0, displayValue: '0.0%' },
          ],
        },
      ],
    },
    downloads: {
      badge: 'GET STARTED TODAY',
      headline: 'Download',
      headlineAccent: 'Nova Browser.',
      subtitle:
        'Free, open-source, and sovereign forever. Engineered for power users, developers, and researchers.',
      macosTitle: 'macOS',
      macosDesc:
        'Native binary optimized for Apple Silicon (M1/M2/M3/M4) and Intel x86 Macs with Metal GPU acceleration.',
      macosAppleSilicon: 'Apple Silicon (ARM64)',
      macosIntel: 'Intel (x64)',
      macosAppleSiliconBtn: 'Apple Silicon (.dmg)',
      macosIntelBtn: 'Intel (.dmg)',
      windowsTitle: 'Windows',
      windowsDesc:
        'Hardened installer for Windows 10 & 11 with DirectX 12 and Vulkan hardware acceleration.',
      windowsInstaller: '64-bit Installer',
      windowsArm: 'ARM64 Compatible',
      windowsInstallerBtn: 'Windows (.exe)',
      windowsArmBtn: 'Portable (.zip)',
      linuxTitle: 'Linux',
      linuxDesc:
        'Universal AppImage, Debian, and RPM packages with Wayland and X11 native windowing support.',
      linuxAppImage: 'Universal AppImage',
      linuxDeb: 'Debian / Ubuntu (.deb)',
      linuxAppImageBtn: 'AppImage (.AppImage)',
      linuxDebBtn: 'Debian (.deb)',
      cliTitle: 'Terminal & Package Manager Installation',
      cliSubtitle: 'One-line shell installations for automated workstation setup',
      copyLabel: 'Copy command',
      copiedLabel: 'Copied!',
      verifiedHash: 'All releases are cryptographically signed and verifiable on GitHub.',
    },
    faq: {
      badge: 'TRANSPARENCY & FREQUENTLY ASKED QUESTIONS',
      headline: 'Clear',
      headlineAccent: 'Answers.',
      subtitle:
        'Everything you need to know about Nova Browser’s security model, local runtime, and architecture.',
      items: [
        {
          category: 'LICENSING',
          question: 'Is Nova Browser really 100% free and open-source?',
          answer:
            'Yes. Nova is completely free and licensed under the permissive MIT Open Source License. There are no paywalls, premium tiers, or hidden subscriptions. The entire codebase is auditable on GitHub.',
        },
        {
          category: 'PRIVACY',
          question: 'Does Nova send any of my browsing data or AI queries to the cloud?',
          answer:
            'No. Nova operates under a zero-telemetry architecture. All autonomous AI synthesis, deep research sidepanel agents, and local memory vault operations execute client-side using local WebGPU shaders and hardware-backed storage. Zero background pings are sent to any analytics servers.',
        },
        {
          category: 'ECOSYSTEM',
          question: 'Can I import my bookmarks and Chrome extensions?',
          answer:
            'Yes. Because Nova is built on modern Chromium and Electron, standard Chromium extensions (Manifest V3) and standard HTML bookmark files can be imported directly into your workspace.',
        },
        {
          category: 'HARDWARE',
          question: 'What are the system requirements for on-device AI?',
          answer:
            'Nova runs smoothly on any Apple Silicon Mac (M1/M2/M3/M4) and modern Windows 10/11 PCs with 8GB+ RAM and DirectX 12 / Vulkan compatible GPUs. For systems without dedicated WebGPU acceleration, lightweight fallback CPU pipelines are supported.',
        },
        {
          category: 'ENGINE',
          question: 'How does 1-click page translation work?',
          answer:
            'Nova packages extracted DOM text nodes into concurrent batch payloads and translates them via high-speed dictionary bridges, cleanly replacing node text in place without altering page layout, styles, or event listeners.',
        },
        {
          category: 'PERFORMANCE',
          question: 'How does tab hibernation save memory compared to Chrome?',
          answer:
            'When background tabs become inactive, Nova suspends their rendering pipeline and pauses inactive background execution cycles while preserving full navigation state. Clicking a suspended tab restores it instantly without losing session context.',
        },
      ],
    },
    footer: {
      quoteLead: '“The browser is no longer a window.',
      quoteAccent: 'It is the engine.”',
      description:
        'Nova is built for a post-cloud web. Local inference, hardened network layer, absolute autonomy.',
      copyright: 'Nova Browser. Open Source Under MIT.',
      resourcesHeading: 'RESOURCES & REPOSITORY',
      githubRepo: 'GitHub Repository',
      releases: 'Releases & Changelog',
      security: 'Security & Issues',
      license: 'MIT License',
      scrollToTop: 'Back to top',
      selectLanguage: 'Language',
    },
  },
  tr: {
    nav: {
      manifesto: 'Manifesto',
      features: 'Özellikler',
      community: 'Topluluk',
      benchmarks: 'Performans',
      download: 'İndir',
      faq: 'SSS',
      getNova: 'Edin',
      downloadCta: 'İndir',
      downloadFree: 'Nova’yı Ücretsiz İndir',
      githubRepo: 'GitHub Deposu',
    },
    manifesto: {
      scrollAria: 'Ana içeriğe doğru kaydır',
      worlds: [
        {
          bg: '#171717',
          bar: '#4338ca',
          ink: '#ffffff',
          lines: ['Nova Browser:', 'Düşünce', 'hızında', 'gezin.'],
        },
        {
          bg: '#042f2e',
          bar: '#10b981',
          ink: '#042f2e',
          lines: ['Sıfır telemetri.', 'Cihaz içi YZ,', 'takip yok,', 'bulut yok.'],
        },
        {
          bg: '#1e1b4b',
          bar: '#818cf8',
          ink: '#0f172a',
          lines: ['WebGPU nöral.', 'Kendi GPU’nda', 'otonom', 'yapay zeka.'],
        },
        {
          bg: '#18181b',
          bar: '#f59e0b',
          ink: '#18181b',
          lines: ['420 MB RAM.', 'Yirmi sekme açık.', 'Hızlı, hafif,', 'yalın.'],
        },
        {
          bg: '#fcfbf9',
          bar: '#171717',
          ink: '#ffffff',
          lines: ['%100 Açık.', 'Senin tarayıcın,', 'senin anahtarın,', 'daima senin.'],
        },
      ],
    },
    hero: {
      titlePrefix: 'Düşünce Hızında',
      titleAccent: 'Gezin.',
      subtitle:
        'Cihaz üstü yapay zeka, yerel izleyici engelleme ve geliştirici sınıfı çalışma alanlarına sahip hızlı, gizlilik odaklı masaüstü tarayıcısı—düşüncelerinizi buluta göndermeden.',
      downloadButton: 'Nova’yı İndir',
      exploreSource: 'Kaynak Kodunu İncele',
    },
    browserDemo: {
      ariaLabel: 'Etkileşimli Nova Browser Canlı Demosu',
      newTabTitle: 'Yeni Sekme — Nova AI',
      githubTabTitle: 'unitybtw/nova-browser',
      researchTabTitle: 'Cihaz Üstü LLM Kıyaslamaları',
      omniboxPlaceholder: 'DuckDuckGo ile ara veya adres gir...',
      omniboxBadge: 'İzole Uçtan Uca Şifreli Oturum',
      aiTitle: 'Nova Asistan',
      aiSubtitle: 'WebGPU Yerel LLM · Sıfır Bulut',
      aiInputPlaceholder: 'Bu sayfa hakkında Nova AI’a dilediğini sor...',
      aiPromptPreset1: 'Araştırma makalesinin temel bulgularını özetle',
      aiPromptPreset2: 'Sayfadaki API şemalarını ayıkla',
      aiPromptPreset3: 'Bu alandaki izleyicileri denetle',
      sampleResponseTitle: 'Cihaz İçi Yönetici Özeti:',
      sampleResponseP1: 'Bu çalışma, istemci tarafı kuantizasyonun bağlam tutarlılığını bozmadan bellek kullanımını %62 azalttığını doğrulamaktadır.',
      sampleResponseP2: 'Öne çıkan bulgu: Yerel WebGPU gölgelendiricileri, modern dizüstü bilgisayarların tümleşik GPU’larında 24ms altı token gecikmesine ulaşmaktadır.',
      statShield: 'Kalkan Aktif',
      statLatency: '21ms WebGPU',
      statWebgpu: 'Yerel Bellek Kasası',
    },
    trustPillars: {
      badge: 'SENİN TARAFINDA GELİŞTİRİLDİ',
      headline: 'Gizlilik bir seçenek değil,',
      headlineAccent: 'Ürünün Kendisidir.',
      subtitle:
        'Bir tarayıcı cihazınızı daha yetenekli kılmalıdır—kişisel bağlamınızı bir başkasının veri setine dönüştürmemelidir.',
      standardLabel: 'Standart:',
      items: [
        {
          tag: 'GİZLİLİK & GÜVENLİK',
          title: 'Sıfır Telemetri & Çevrimdışı Çekirdek',
          description:
            'Sıfır arka plan isteği, analitik izleyici veya kullanıcı telemetrisi. Tüm ağ trafiği yalnızca kullanıcı eylemlerinden doğar.',
          stat: '0 KB Gönderildi',
        },
        {
          tag: 'YEREL DONANIM',
          title: 'Cihaz Üstü WebGPU Çıkarımı',
          description:
            'Otonom yapay zeka ajanları, istemci tarafı WebGPU hesaplama gölgelendiricileriyle harici sunuculara veri aktarmadan yerel çalışır.',
          stat: '%100 Cihaz İçi',
        },
        {
          tag: 'AÇIK KAYNAK',
          title: 'MIT Lisanslı & Doğrulanabilir',
          description:
            'Electron, Chromium ve IPC katmanındaki her kod satırı GitHub üzerinde açık kaynak, incelenebilir ve çatallanabilir.',
          stat: 'Açık Kaynak',
        },
        {
          tag: 'GÜVENLİ KUM HAVUZU',
          title: 'Sıfır Bilgili Şifre Kasası',
          description:
            'Parolalar, çerezler ve yerel veri kayıtları, donanım destekli işletim sistemi anahtarlıklarıyla AES-256-GCM ile şifrelenir.',
          stat: 'AES-256-GCM',
        },
      ],
      canvasLines: [
        { line: 'tarayıcı artık bir pencere değil, motor', bg: '#0c0d12', fg: '#38bdf8' },
        { line: 'bağımsız yerel yapay zeka', bg: '#1e1b4b', fg: '#a78bfa' },
        { line: 'sıfır telemetri. sıfır bulut.', bg: '#064e3b', fg: '#6ee7b7' },
        { line: 'düşünce hızında özgür gezinim', bg: '#4338ca', fg: '#fde047' },
        { line: 'yerel donanım webgpu hızlandırma', bg: '#171717', fg: '#f472b6' },
        { line: 'senin cihazın. senin kuralların.', bg: '#7c2d12', fg: '#fed7aa' },
      ],
    },
    features: {
      badge: 'MİMARİ MATRİSİ',
      headline: 'Tam Bağımsızlık İçin',
      headlineAccent: 'Tasarlandı.',
      subtitle:
        'Egemen ve bağımsız bilgi işlem için ödün vermeden inşa edilmiş modüler mimari sütunlar.',
      agentTitle: 'Otonom Yerel Yapay Zeka Ajanı',
      agentTag: 'WEBGPU NÖRAL ÇALIŞMA ZAMANI',
      agentDesc:
        'Llama 3.2 3B ve Phi 3.5 Vision ile cihaz üstü nöral çıkarım. %0 bulut aktarımı ile derin DOM analizi, gölgelendirici yürütme ve kod sentezi.',
      agentStat: '%100 YEREL WEBGPU',
      vaultTitle: 'Sıfır Bilgili Kriptografik Kasa',
      vaultTag: 'AES-256-GCM UÇTAN UCA',
      vaultDesc:
        'İstemci tarafı PBKDF2 anahtar türetimi. Sekmeleriniz, geçmişiniz ve parolalarınız sunucularda şifre çözme anahtarı olmadan senkronize olur.',
      vaultStat: 'UÇTAN UCA',
      splitTitle: 'Çift Görünümlü Bölünmüş Ekran',
      splitTag: 'PARALEL ÇALIŞMA',
      splitDesc:
        'Senkronize kaydırma ve sürükleme özellikli iki bağımsız webview oturumunda eşzamanlı çalışın.',
      splitStat: 'SENKRONİZE',
      privacyTitle: 'Milisaniye-Altı Gizlilik Kalkanı',
      privacyTag: 'AĞ FİLTRELEME MOTORU',
      privacyDesc:
        'DOM ayrıştırması başlamadan önce reklam izleyicilerini ve telemetri paketlerini ağ seviyesinde keser.',
      privacyStat: '<1ms KARAR',
      mcpTitle: 'Yerel MCP Sunucu Köprüsü',
      mcpTag: 'PORT 3020 SSE',
      mcpDesc:
        'Terminal komutlarını, betikleri ve yerel LLM modellerini bağlamak için yerel çalışan entegre Model Context Protocol sunucusu.',
      mcpStat: 'YALNIZCA LOCALHOST',
      textRevealPairs: [
        {
          top: ['Tarayıcı artık bir pencere değil,', 'bizzat motordur.'],
          bottom: ['Çok modelli yapay zekayı', 'tamamen yerel donanımda çalıştırın.'],
        },
        {
          top: ['Sıfır telemetri. Sıfır izleyici.', 'Senin cihazın, senin bağımsız alanın.'],
          bottom: ['Düşünce hızında gezin,', 'harici bulutlara bağımlı kalmadan.'],
        },
        {
          top: ['Yazı tipi bir hava durumu gibi hareket eder,', 'kenarlardan içeri süzülür.'],
          bottom: ['Yerel WebGPU ile', 'güçlendirilmiş ağ yalıtımı.'],
        },
        {
          top: ['Küçük ayrıntılar kusursuz işlendiğinde,', 'gürültü değil sükunet duyulur.'],
          bottom: ['Geleceğin bilgi işlem çağı için', 'inşa edilmiş egemen mimari.'],
        },
      ],
    },
    community: {
      badge: 'ŞEFFAF GELİŞTİRME',
      headline: 'Açıkça',
      headlineAccent: 'Geliştirildi.',
      subtitle:
        'Topluluk katkıcıları tarafından desteklenen bağımsız açık kaynak mühendisliği ve sıfır girişim sermayesi bağımsızlığı.',
      starsLabel: 'GitHub Yıldızları',
      forksLabel: 'Aktif Çatallar',
      watchersLabel: 'Takipçiler',
      statusLive: 'Canlı GitHub Verisi',
      statusCached: 'Önbelleğe Alınmış',
      statusLoading: 'GitHub İle Eşitleniyor...',
      updatedPrefix: 'Güncellendi',
      viewOnGithub: 'GitHub deposunu görüntüle',
      milestoneBadge: 'SÜRÜM YOL HARİTASI',
      milestones: [
        {
          version: 'v1.5.0',
          date: 'Mevcut Sürüm',
          tag: 'En Güncel',
          description:
            'Electron 43+ Fuse Düzeltmesi (GrantFileProtocolExtraPrivileges), AdBlocker İzolasyonu ve Yerel Whisper AI',
        },
        {
          version: 'v1.4.0',
          date: 'Eyl 2026',
          tag: 'Kararlı',
          description:
            'Donanım hızlandırmalı WebGPU yerel yapay zeka motoru, bölünmüş ekran iş akışları ve reklam engelleyici.',
        },
        {
          version: 'v1.2.0',
          date: 'Ağu 2026',
          tag: 'Sürüm',
          description:
            'Çalışma alanı yönetimi, dikey sekme navigasyonu ve sıfır bilgili şifrelenmiş senkronizasyon.',
        },
        {
          version: 'v1.0.0',
          date: 'Tem 2026',
          tag: 'İlk Çıkış',
          description:
            'Electron 39 üzerinde çalışan bağımsız açık kaynak tarayıcı çekirdeğinin ilk halka açık lansmanı.',
        },
      ],
    },
    benchmarks: {
      badge: 'DOĞRULANMIŞ TELEMETRİ & VERİMLİLİK',
      headline: 'Yüksek Performans İçin',
      headlineAccent: 'Test Edildi.',
      subtitle:
        'Standart masaüstü gezinme iş yüklerine karşı deneysel ve tekrarlanabilir performans denetimleri.',
      interactiveTitle: 'Etkileşimli Kategori Kıyaslamaları',
      interactiveSubtitle:
        'Deneysel karşılaştırmaları ve mimari detayları görmek için bir metrik kategorisi seçin.',
      lowerIsBetter: 'Düşük olması daha iyidir',
      higherIsBetter: 'Yüksek olması daha iyidir',
      viewAllMetrics: 'Tüm kategoriler doğrulandı',
      categories: [
        {
          id: 'memory',
          title: 'Bellek & Sekme Uyutma',
          subtitle: 'Arka Plan İşlem Askıya Alma ile 20 Etkin Olmayan Sekme',
          badge: 'Askıya Alma Motoru',
          highlightNumber: '420',
          highlightUnit: 'MB',
          highlightLabel: 'Toplam RAM (20 Sekme)',
          summary:
            'Nova, uyuyan arka plan sekmelerindeki render döngülerini durdurarak çok sekmeli oturumlarda taban bellek kullanımını düşük tutar.',
          metricLabel: '20 etkin olmayan sekme açıkken yaklaşık kullanılan bellek',
          directionLabel: 'Düşük olması daha iyidir',
          directionDescription:
            'Arka plan sekmelerini duraklatmak, aktif uygulamalar için daha fazla sistem belleği bırakır.',
          benchmarkNote:
            'Test ortamı: 20 etkin olmayan arka plan sekmesi askıya alınmış tipik kullanım; aktif medya oynatan sekmeler normal ölçeklenir.',
          competitors: [
            { name: 'Nova Browser', value: 420, displayValue: '~420 MB', isWinner: true },
            { name: 'Google Chrome', value: 1180, displayValue: '~1.180 MB' },
            { name: 'Brave Browser', value: 920, displayValue: '~920 MB' },
          ],
        },
        {
          id: 'speed',
          title: 'Soğuk Başlatma & V8 Bellek Alanı',
          subtitle: 'Başlangıç Belleği & JS Paket Optimizasyonu',
          badge: 'Hafif V8 Alanı',
          highlightNumber: '31.2',
          highlightUnit: 'MB',
          highlightLabel: 'İlk V8 Heap Boyutu',
          summary:
            'Modüler parça ayrımı ve bağımsız WebLLM nöral çalışma zamanı, ilk JS değerlendirmesini minimum bellek ayırmayla ~435 KB seviyesinde tutar.',
          metricLabel: 'Başlangıçta ilk V8 JavaScript bellek tahsisi',
          directionLabel: 'Düşük olması daha iyidir',
          directionDescription:
            'Düşük başlangıç bellek tahsisi, sekmeler ve uygulamalar için daha fazla boş sistem belleği sağlar.',
          benchmarkNote:
            'Motor Eşitliği: Chrome ile birebir aynı Chromium Blink ve Google V8 motorunu çalıştırır. Fark, sıfır telemetri ve modüler mimariden kaynaklanır.',
          competitors: [
            { name: 'Nova Browser', value: 31.2, displayValue: '31.2 MB', isWinner: true },
            { name: 'Google Chrome', value: 85.0, displayValue: '~85.0 MB' },
            { name: 'Brave Browser', value: 78.0, displayValue: '~78.0 MB' },
          ],
        },
        {
          id: 'ai',
          title: 'Gizli Cihaz Üstü Yapay Zeka',
          subtitle: 'Sıfır Bulut İstemi & Sıfır Veri İletimi',
          badge: '%100 Çevrimdışı YZ',
          highlightNumber: '0',
          highlightUnit: 'KB',
          highlightLabel: 'Buluta Gönderilen Veri',
          summary:
            'İstemci tarafı WebGPU, sohbetlerinizi, kodlarınızı veya sayfa içeriklerinizi harici sunuculara göndermeden doğrudan tarayıcı içinde çalıştırır.',
          metricLabel: 'Üçüncü taraf yapay zeka bulut sunucularına iletilen ağ verisi',
          directionLabel: 'Düşük olması daha iyidir',
          directionDescription: 'Sıfır bayt iletimi, mutlak kullanıcı egemenliğini ve gizliliğini garanti eder.',
          benchmarkNote:
            'Sıfır Bulut Mimarisi: Tüm token üretimi ve gömmeler (embeddings) WebGPU hesaplama gölgelendiricileriyle istemcide yürütülür.',
          competitors: [
            { name: 'Nova Browser', value: 0, displayValue: '0 KB', isWinner: true },
            { name: 'Edge Copilot', value: 850, displayValue: '~850 KB/istek' },
            { name: 'Chrome Gemini', value: 920, displayValue: '~920 KB/istek' },
          ],
        },
        {
          id: 'privacy',
          title: 'Reklam & İzleyici Ağ Engelleme',
          subtitle: 'En Çok Ziyaret Edilen 50 Medya Sitesinde Ağ Düzeyi Engelleme Oranı',
          badge: 'Adblock Çekirdeği',
          highlightNumber: '99.4',
          highlightUnit: '%',
          highlightLabel: 'Engellenen Bilinen İzleyiciler',
          summary:
            'Yerel Rust/C++ örüntü eşleme motoru, izleme sinyallerini soketler açılmadan önce ağ düzeyinde keser ve reklam yüklemesini tamamen önler.',
          metricLabel: 'Engellenen üçüncü taraf izleme alan adlarının yüzdesi',
          directionLabel: 'Yüksek olması daha iyidir',
          directionDescription:
            'Daha yüksek engelleme oranları, izleme ayak izini küçültür ve profil çıkarılmasını engeller.',
          benchmarkNote:
            'Filtre listeleri: Belleğe eşlenmiş bayt dizilerine derlenmiş EasyList, EasyPrivacy ve uBlock Origin temel filtreleri.',
          competitors: [
            { name: 'Nova Browser', value: 99.4, displayValue: '%99.4', isWinner: true },
            { name: 'Brave Browser', value: 98.7, displayValue: '%98.7' },
            { name: 'Chrome (Eklentisiz)', value: 0, displayValue: '%0.0' },
          ],
        },
      ],
    },
    downloads: {
      badge: 'HEMEN BAŞLAYIN',
      headline: 'Nova Browser’ı',
      headlineAccent: 'İndirin.',
      subtitle:
        'Sonsuza kadar ücretsiz, açık kaynaklı ve bağımsız. İleri düzey kullanıcılar, araştırmacılar ve yazılımcılar için tasarlandı.',
      macosTitle: 'macOS',
      macosDesc:
        'Apple Silicon (M1/M2/M3/M4) ve Intel x86 Mac sistemleri için Metal GPU hızlandırmasıyla optimize edilmiş yerel ikili dosya.',
      macosAppleSilicon: 'Apple Silicon (ARM64)',
      macosIntel: 'Intel (x64)',
      macosAppleSiliconBtn: 'Apple Silicon (.dmg)',
      macosIntelBtn: 'Intel (.dmg)',
      windowsTitle: 'Windows',
      windowsDesc:
        'DirectX 12 ve Vulkan donanım hızlandırmasıyla donatılmış Windows 10 & 11 için güçlendirilmiş yükleyici.',
      windowsInstaller: '64-bit Yükleyici',
      windowsArm: 'ARM64 Uyumlu',
      windowsInstallerBtn: 'Windows (.exe)',
      windowsArmBtn: 'Taşınabilir (.zip)',
      linuxTitle: 'Linux',
      linuxDesc:
        'Wayland ve X11 yerel pencereleme desteğine sahip evrensel AppImage, Debian ve RPM paketleri.',
      linuxAppImage: 'Evrensel AppImage',
      linuxDeb: 'Debian / Ubuntu (.deb)',
      linuxAppImageBtn: 'AppImage (.AppImage)',
      linuxDebBtn: 'Debian (.deb)',
      cliTitle: 'Terminal & Paket Yöneticisi Kurulumu',
      cliSubtitle: 'Otomatik çalışma istasyonu kurulumu için tek satırlık kabuk komutları',
      copyLabel: 'Komutu kopyala',
      copiedLabel: 'Kopyalandı!',
      verifiedHash: 'Tüm sürümler kriptografik olarak imzalanmıştır ve GitHub üzerinden doğrulanabilir.',
    },
    faq: {
      badge: 'ŞEFFAFLIK & SIKÇA SORULAN SORULAR',
      headline: 'Net',
      headlineAccent: 'Cevaplar.',
      subtitle:
        'Nova Browser’ın güvenlik modeli, yerel çalışma ortamı ve mimarisi hakkında merak ettiğiniz her şey.',
      items: [
        {
          category: 'LİSANS',
          question: 'Nova Browser gerçekten %100 ücretsiz ve açık kaynak mı?',
          answer:
            'Evet. Nova tamamen ücretsizdir ve esnek MIT Açık Kaynak Lisansı altında yayınlanmıştır. Ödeme duvarı, ücretli katman veya gizli abonelik bulunmaz. Tüm kod tabanı GitHub üzerinden denetlenebilir.',
        },
        {
          category: 'GİZLİLİK',
          question: 'Nova gezinme verilerimi veya yapay zeka sorgularımı buluta gönderir mi?',
          answer:
            'Hayır. Nova kesin sıfır telemetri mimarisiyle çalışır. Tüm otonom yapay zeka sentezleri, derin araştırma yan panel ajanları ve yerel kasa işlemleri yerel WebGPU gölgelendiricileriyle istemcide yürütülür. Hiçbir analiz sunucusuna arka plan isteği gönderilmez.',
        },
        {
          category: 'EKOSİSTEM',
          question: 'Yer imlerimi ve Chrome eklentilerimi içe aktarabilir miyim?',
          answer:
            'Evet. Nova modern Chromium ve Electron üzerine inşa edildiğinden, standart Chromium eklentileri (Manifest V3) ve standart HTML yer imi dosyaları doğrudan çalışma alanınıza aktarılabilir.',
        },
        {
          category: 'DONANIM',
          question: 'Cihaz üstü yapay zeka için sistem gereksinimleri nelerdir?',
          answer:
            'Nova, tüm Apple Silicon Mac’lerde (M1/M2/M3/M4) ve 8GB+ RAM ile DirectX 12 / Vulkan destekli GPU’ya sahip modern Windows 10/11 sistemlerde akıcı çalışır. Özel WebGPU hızlandırması olmayan sistemler için hafif CPU alternatif hatları mevcuttur.',
        },
        {
          category: 'MOTOR',
          question: 'Tek tıkla sayfa çevirisi nasıl çalışır?',
          answer:
            'Nova, ayıklanan DOM metin düğümlerini eşzamanlı toplu paketler halinde işler ve sayfa düzenini, stilleri veya olay dinleyicilerini bozmadan yüksek hızlı sözlük köprüsüyle yerinde çevirir.',
        },
        {
          category: 'PERFORMANS',
          question: 'Sekme uyutma özelliği Chrome’a göre nasıl bellek tasarrufu sağlar?',
          answer:
            'Arka plan sekmeleri pasif hale geldiğinde Nova, tam navigasyon durumunu koruyarak render işlem hattını ve pasif arka plan döngülerini askıya alır. Askıdaki sekmeye tıklandığında oturum kaybolmadan anında geri yüklenir.',
        },
      ],
    },
    footer: {
      quoteLead: '“Tarayıcı artık bir pencere değil.',
      quoteAccent: 'Bizzat motordur.”',
      description:
        'Nova, bulut sonrası modern internet için inşa edildi. Yerel çıkarım, güçlendirilmiş ağ katmanı, mutlak egemenlik.',
      copyright: 'Nova Browser. MIT Lisansı ile Açık Kaynak.',
      resourcesHeading: 'KAYNAKLAR & DEPO',
      githubRepo: 'GitHub Deposu',
      releases: 'Sürümler & Değişiklik Günlüğü',
      security: 'Güvenlik & Hata Bildirimi',
      license: 'MIT Lisansı',
      scrollToTop: 'Başa Dön',
      selectLanguage: 'Dil',
    },
  },
};

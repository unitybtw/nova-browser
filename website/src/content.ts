export type Lang = 'en' | 'tr'

export type StudioSurface = 'dark' | 'light'
export type StudioScenarioId = 'studio' | 'vertical' | 'ai' | 'split'

export interface StudioScenarioSpec {
  id: StudioScenarioId
  feature: 'studio' | 'vertical_tabs' | 'ai' | 'split'
  tabs: 'horizontal' | 'vertical'
}

export const STUDIO_SCENARIOS: readonly StudioScenarioSpec[] = [
  { id: 'studio', feature: 'studio', tabs: 'horizontal' },
  { id: 'vertical', feature: 'vertical_tabs', tabs: 'vertical' },
  { id: 'ai', feature: 'ai', tabs: 'vertical' },
  { id: 'split', feature: 'split', tabs: 'horizontal' },
] as const

export interface FeatureProofItem {
  id: string
  title: string
  body: [string, string]
  image: string
  alt: string
  width: number
  height: number
  cropPosition: string
}

export interface SiteCopy {
  docTitle: string
  skip: string
  homeLabel: string
  navLabel: string
  nav: [string, string, string, string]
  get: string
  languageLabel: string
  menuOpen: string
  menuClose: string
  heroIntro: string
  download: string
  watchFilm: string
  heroMeta: string
  studioSectionLabel: string
  studioTabs: [string, string, string, string]
  studioTabTitles: [string, string, string, string]
  studioTabDescriptions: [string, string, string, string]
  studioSurfaceLabel: string
  studioSurfaces: Record<StudioSurface, string>
  studioIframeTitle: string
  studioOpenFull: string
  studioPrimaryAction: string
  studioSecondaryAction: string
  studioCaption: string
  featuresHeading: string
  featuresLead: string
  features: FeatureProofItem[]
  aboutLabel: string
  aboutFacts: Array<[string, string]>
  aboutStatement: string
  aboutAction: string
  aboutRowLabel: string
  aboutSpecsLeft: Array<[string, string]>
  aboutSpecsRight: Array<[string, string]>
  faqHeading: string
  faq: Array<[string, string]>
  downloadHeading: [string, string]
  downloadLead: string
  allReleases: string
  installerHeading: string
  installerSubheading: string
  desktopNote: string
  footerInvitation: [string, string]
  footerAction: string
  footerLinks: [string, string, string]
  footerNavLabel: string
  footerLicense: string
  backToTop: string
  videoTitle: string
  videoDescription: string
  videoError: string
  retryVideo: string
  close: string
}

export const REPO_URL = 'https://github.com/unitybtw/nova-browser'
export const RELEASE_VERSION = 'v1.5.2'
export const RELEASE_BASE = `${REPO_URL}/releases/download/${RELEASE_VERSION}/`

export const PLATFORMS = [
  {
    id: 'macos',
    name: 'macOS',
    choices: [
      { name: 'Apple Silicon', detail: 'M1, M2, M3, M4', file: 'Nova-Browser-arm64.dmg', ext: '.dmg' },
      { name: 'Intel', detail: 'x64 Mac', file: 'Nova-Browser-x64.dmg', ext: '.dmg' },
    ],
  },
  {
    id: 'windows',
    name: 'Windows',
    choices: [
      { name: 'Installer', detail: 'Windows x64 Setup', file: 'Nova-Browser-Setup-1.5.2-x64.exe', ext: '.exe' },
      { name: 'Portable', detail: 'Standalone x64', file: 'Nova-Browser-1.5.2-x64.exe', ext: '.exe' },
    ],
  },
  {
    id: 'linux',
    name: 'Linux',
    choices: [
      { name: 'AppImage', detail: 'Universal x64', file: 'Nova-Browser-x86_64.AppImage', ext: '.AppImage' },
      { name: 'Debian / Ubuntu', detail: 'x64 Package', file: 'Nova-Browser-amd64.deb', ext: '.deb' },
    ],
  },
] as const

export const copy: Record<Lang, SiteCopy> = {
  en: {
    docTitle: 'Nova. Open-source desktop browser.',
    skip: 'Skip to content',
    homeLabel: 'Nova home',
    navLabel: 'Main navigation',
    nav: ['Live demo', 'Capabilities', 'Open source', 'FAQ'],
    get: 'Get Nova',
    languageLabel: 'Switch to Turkish',
    menuOpen: 'Open navigation',
    menuClose: 'Close navigation',
    heroIntro: 'The open-source desktop browser you reshape live, with local WebGPU AI, workspaces, and encrypted sync.',
    download: 'Download Nova',
    watchFilm: 'Watch 42s film',
    heroMeta: 'MIT open source for macOS, Windows, and Linux.',
    studioSectionLabel: 'Interactive Nova Browser demo',
    studioTabs: ['Live Design Studio', 'Vertical Tabs', 'Local AI', 'Split View'],
    studioTabTitles: [
      'Reshape Nova live.',
      'Vertical workspaces.',
      'Assistant on your GPU.',
      'Two pages, one window.',
    ],
    studioTabDescriptions: [
      'This is the real Nova Browser interface running inside your page. Switch between Classic Top, Compact Row, and Vertical layouts or reorder toolbar slots right inside the window.',
      'Pin daily tools, group tabs into collapsible folders, and isolate Personal, Work, and Research workspaces without losing focus.',
      'Open Nova AI beside any tab to query open pages or manage tabs. Supported models run directly on your device through WebGPU after the initial download.',
      'Inspect documentation and live repositories side by side inside a single window with a resizable split divider.',
    ],
    studioSurfaceLabel: 'Theme',
    studioSurfaces: {
      dark: 'Dark',
      light: 'Light',
    },
    studioIframeTitle: 'Interactive Nova Browser v1.5.2 live demo',
    studioOpenFull: 'Open fullscreen',
    studioPrimaryAction: 'Download Nova',
    studioSecondaryAction: 'Watch 42s film',
    studioCaption: 'Running the real Nova v1.5.2 React interface inside the browser. Desktop builds add native Chromium tabs, CRX3 extensions, and local MCP.',
    featuresHeading: 'Built into the frame.',
    featuresLead: 'Every capability lives directly inside the native desktop shell, captured fresh from Nova v1.5.2.',
    features: [
      {
        id: 'live-studio',
        title: 'Live Design Studio',
        body: [
          'Rearrange toolbar controls by drag and drop, switch between four tab-bar geometries, and customize every New Tab widget while watching the browser update immediately.',
          'Apply one global design or assign distinct themes per workspace, then export and share your setup as a portable theme pack.',
        ],
        image: '/images/shot-studio.jpg',
        alt: 'Nova v1.5.2 Live Design Studio showing Classic Top, Compact Row, Vertical Left, and Vertical Right shell layout controls in dark mode',
        width: 1440,
        height: 900,
        cropPosition: '100% 0%',
      },
      {
        id: 'local-ai',
        title: 'Local WebGPU sidebar',
        body: [
          'Ask questions about open pages or manage tabs from the sidebar assistant without routing every prompt through a hosted browser cloud.',
          'Supported models run locally on your graphics hardware via WebGPU. An initial model download and compatible GPU memory are required.',
        ],
        image: '/images/shot-ai.jpg',
        alt: 'Nova v1.5.2 with vertical tabs and the Local WebGPU AI assistant sidebar open in dark mode',
        width: 1440,
        height: 900,
        cropPosition: '100% 0%',
      },
      {
        id: 'workspaces-split',
        title: 'Workspaces and split view',
        body: [
          'Keep Personal, Work, and Research contexts isolated so tabs never bleed across projects. Open two live pages side by side inside one window.',
          'Background tabs automatically sleep after inactivity to preserve system memory during heavy research sessions.',
        ],
        image: '/images/shot-split.jpg',
        alt: 'Nova v1.5.2 displaying a GitHub repository and New Tab side by side in dark Split View',
        width: 1440,
        height: 900,
        cropPosition: '50% 0%',
      },
      {
        id: 'mcp-extensions',
        title: 'Chrome Web Store and local MCP',
        body: [
          'Install extensions directly from the Chrome Web Store or by pasting a store URL or 32-character extension ID with CRX3 signature parsing and Manifest V3 popup support.',
          'Connect compatible coding agents directly to Nova through its built-in local MCP server so tools can inspect and navigate tabs under your control.',
        ],
        image: '/images/shot-extensions.jpg',
        alt: 'Nova v1.5.2 Extensions modal with direct Chrome Web Store URL and extension ID installer bar',
        width: 1440,
        height: 900,
        cropPosition: '50% 45%',
      },
      {
        id: 'shield-sync',
        title: 'Network shield and sync',
        body: [
          'Built-in network filtering blocks ads and known trackers before pages paint, while private tabs run in isolated per-tab partitions.',
          'Nova Sync encrypts bookmarks and passwords on your device with AES-256-GCM through your Nova Cloud account. Code-based device pairing is not in this build.',
        ],
        image: '/images/shot-sync.jpg',
        alt: 'Nova v1.5.2 Sync sign-in dialog in dark mode explaining encrypted bookmark and password syncing via Nova Cloud',
        width: 1440,
        height: 900,
        cropPosition: '50% 50%',
      },
    ],
    aboutLabel: 'Open source architecture',
    aboutFacts: [
      ['License', 'MIT'],
      ['Release', 'v1.5.2'],
      ['Platforms', 'macOS, Windows, Linux'],
    ],
    aboutStatement: 'Nova is built completely in the open, from the Electron process boundaries to the React interface and local CRX3 installer. Read every commit, verify every permission check, or compile your own build straight from GitHub.',
    aboutAction: 'Explore on GitHub',
    aboutRowLabel: 'Architecture',
    aboutSpecsLeft: [
      ['Live Design Studio', '4 tab geometries'],
      ['Local AI runtime', 'WebGPU on-device'],
      ['Agent interface', 'Built-in MCP server'],
      ['Extensions', 'Chrome Web Store CRX3'],
      ['Network blocking', 'Built-in shield'],
      ['Private tabs', 'Per-tab partitions'],
    ],
    aboutSpecsRight: [
      ['Sync encryption', 'AES-256-GCM'],
      ['Desktop shell', 'Electron and React'],
      ['Installers', 'DMG, EXE, AppImage, DEB'],
      ['Interface languages', 'English and Turkish'],
      ['Source license', 'MIT open source'],
      ['Current release', 'v1.5.2'],
    ],
    faqHeading: 'Common questions.',
    faq: [
      [
        'Is Nova free and open source?',
        'Yes. Nova is free to download and released under the MIT license. You can inspect the full source code, file issues, or build it yourself on GitHub.',
      ],
      [
        'Which desktop systems are supported?',
        'Official v1.5.2 installers are published for macOS on Apple Silicon and Intel, Windows x64 (Setup and Portable), and Linux x64 (AppImage and Debian/Ubuntu).',
      ],
      [
        'How does local WebGPU AI work?',
        'Supported language models execute directly on your device GPU via WebGPU. You download the model once before first use, and speed depends on your graphics hardware and available memory.',
      ],
      [
        'Can I install Chrome Web Store extensions?',
        'Yes. You can install directly from the Chrome Web Store page or paste a store URL or 32-character extension ID inside Nova. Compatibility depends on the Chrome APIs each extension requires.',
      ],
      [
        'How does Nova Sync protect my data?',
        'Bookmarks and passwords are encrypted locally on your device using AES-256-GCM before syncing through your Nova Cloud account. Device pairing via a sync code is not available in this build.',
      ],
      [
        'How much of the browser interface can I customize?',
        'Live Design Studio lets you switch between top, compact single-row, below-toolbar, and vertical sidebar tabs, reorder toolbar slots, edit New Tab widgets, and set custom themes globally or per workspace.',
      ],
    ],
    downloadHeading: ['Download', 'Nova.'],
    downloadLead: 'Choose your desktop platform to download official v1.5.2 installers straight from GitHub Releases.',
    allReleases: 'All releases and checksums',
    installerHeading: 'Official v1.5.2 installers',
    installerSubheading: 'Select your operating system',
    desktopNote: 'Nova is a desktop browser for macOS, Windows, and Linux.',
    footerInvitation: ['Keep the', 'web yours.'],
    footerAction: 'Explore on GitHub',
    footerLinks: ['Source code', 'Release notes', 'Report an issue'],
    footerNavLabel: 'Footer navigation',
    footerLicense: 'MIT Open Source. Built in the open.',
    backToTop: 'Back to top',
    videoTitle: 'Nova v1.5.2 launch film',
    videoDescription: 'A 42-second Nova Browser v1.5.2 launch film featuring Live Design Studio, workspaces, local WebGPU AI, Chrome Web Store extensions, and encrypted sync with English and Turkish captions.',
    videoError: 'The video could not load. Check your connection and try again.',
    retryVideo: 'Retry video',
    close: 'Close',
  },
  tr: {
    docTitle: 'Nova. Açık kaynak masaüstü tarayıcı.',
    skip: 'İçeriğe geç',
    homeLabel: 'Nova ana sayfa',
    navLabel: 'Ana gezinme',
    nav: ['Canlı demo', 'Yetenekler', 'Açık kaynak', 'SSS'],
    get: 'Nova’yı edin',
    languageLabel: 'Switch to English',
    menuOpen: 'Menüyü aç',
    menuClose: 'Menüyü kapat',
    heroIntro: 'Canlı olarak şekillendirdiğin açık kaynak masaüstü tarayıcı. Yerel WebGPU yapay zekâ, çalışma alanları ve şifreli eşitleme.',
    download: 'Nova’yı indir',
    watchFilm: '42 sn filmi izle',
    heroMeta: 'macOS, Windows ve Linux için MIT açık kaynak.',
    studioSectionLabel: 'Etkileşimli Nova Browser demosu',
    studioTabs: ['Live Design Studio', 'Dikey Sekmeler', 'Yerel AI', 'Bölünmüş Ekran'],
    studioTabTitles: [
      'Nova’yı canlı şekillendir.',
      'Dikey çalışma alanları.',
      'GPU’nda yerel asistan.',
      'Tek pencerede iki sayfa.',
    ],
    studioTabDescriptions: [
      'Bu pencere içinde çalışan gerçek Nova Browser arayüzüdür. Klasik Üst, Kompakt Satır ve Dikey düzenler arasında geç veya araç çubuğu yuvalarını doğrudan içeriden değiştir.',
      'Günlük araçlarını sabitle, sekmelerini klasörlerde topla ve Kişisel, İş ile Araştırma çalışma alanlarını birbirinden ayır.',
      'Herhangi bir sekmenin yanında Nova AI’ı açarak açık sayfaları sorgula veya sekmeleri yönet. Desteklenen modeller ilk indirmeden sonra WebGPU ile cihazında çalışır.',
      'Dokümantasyonu ve canlı depoları tek pencere içinde boyutlandırılabilir bölünmüş ekranla yan yana incele.',
    ],
    studioSurfaceLabel: 'Tema',
    studioSurfaces: {
      dark: 'Koyu',
      light: 'Açık',
    },
    studioIframeTitle: 'Etkileşimli Nova Browser v1.5.2 canlı demosu',
    studioOpenFull: 'Tam ekran aç',
    studioPrimaryAction: 'Nova’yı indir',
    studioSecondaryAction: '42 sn filmi izle',
    studioCaption: 'Gerçek Nova v1.5.2 React arayüzü doğrudan sayfada çalışıyor. Masaüstü sürümü yerel Chromium sekmeleri, CRX3 eklentileri ve yerel MCP ekler.',
    featuresHeading: 'Tarayıcının içinde.',
    featuresLead: 'Tüm yetenekler doğrudan yerel masaüstü çekirdeğinde çalışır ve burada güncel Nova v1.5.2 görüntüleriyle yer alır.',
    features: [
      {
        id: 'live-studio',
        title: 'Live Design Studio',
        body: [
          'Araç çubuğu düğmelerini sürükleyip bırakarak sırala, dört farklı sekme geometrisi arasında anında geç ve Yeni Sekme bileşenlerini canlı düzenle.',
          'Tek bir genel tasarım uygula veya her çalışma alanına ayrı tema ata; kurduğun düzeni tema paketi olarak dışa aktar.',
        ],
        image: '/images/shot-studio.jpg',
        alt: 'Koyu temada Klasik Üst, Kompakt Satır, Dikey Sol ve Dikey Sağ düzen seçeneklerini gösteren Nova v1.5.2 Live Design Studio arayüzü',
        width: 1440,
        height: 900,
        cropPosition: '100% 0%',
      },
      {
        id: 'local-ai',
        title: 'Yerel WebGPU kenar çubuğu',
        body: [
          'Açık sayfalar hakkında sorular sor veya sekmelerini kenar çubuğu asistanıyla yönet; her istemi harici bir tarayıcı bulutuna göndermeden çalış.',
          'Desteklenen modeller WebGPU üzerinden doğrudan kendi ekran kartında çalışır. İlk kullanımda model indirmesi ve uyumlu donanım gerekir.',
        ],
        image: '/images/shot-ai.jpg',
        alt: 'Koyu temada dikey sekmeler ve açık yerel WebGPU Nova AI kenar çubuğu ile Nova v1.5.2',
        width: 1440,
        height: 900,
        cropPosition: '100% 0%',
      },
      {
        id: 'workspaces-split',
        title: 'Çalışma alanları ve bölünmüş ekran',
        body: [
          'Kişisel, İş ve Araştırma bağlamlarını birbirinden ayırarak sekme karmaşasını bitir. Tek pencere içinde iki canlı sayfayı yan yana aç.',
          'Arka planda bekleyen sekmeler otomatik uykuya geçerek yoğun araştırma oturumlarında sistem belleğini korur.',
        ],
        image: '/images/shot-split.jpg',
        alt: 'Koyu temada bölünmüş görünümde GitHub deposu ve Yeni Sekmeyi yan yana gösteren Nova v1.5.2',
        width: 1440,
        height: 900,
        cropPosition: '50% 0%',
      },
      {
        id: 'mcp-extensions',
        title: 'Chrome Web Store ve yerel MCP',
        body: [
          'Chrome Web Store sayfasından tek tıkla ya da mağaza URL’si ve 32 karakterli kimlik yapıştırarak CRX3 paketlerini kur; izin incelemesi ve MV3 açılır pencere desteği yerleşiktir.',
          'Uyumlu kodlama ajanlarını yerleşik yerel MCP sunucusu üzerinden doğrudan Nova’ya bağla; sekmeleri kontrolün altında incele ve yönet.',
        ],
        image: '/images/shot-extensions.jpg',
        alt: 'Doğrudan Chrome Web Store URL ve kimlik kurucu çubuğunu gösteren Nova v1.5.2 Eklentiler penceresi',
        width: 1440,
        height: 900,
        cropPosition: '50% 45%',
      },
      {
        id: 'shield-sync',
        title: 'Ağ kalkanı ve şifreli eşitleme',
        body: [
          'Yerleşik ağ filtresi reklamları ve bilinen izleyicileri sayfa yüklenmeden engeller; gizli sekmeler birbirinden yalıtılmış oturumlarda çalışır.',
          'Nova Sync yer imlerini ve parolalarını cihazında AES-256-GCM ile şifreleyerek Nova Cloud hesabınla eşitler. Bu sürümde kodla eşleştirme bulunmaz.',
        ],
        image: '/images/shot-sync.jpg',
        alt: 'Koyu temada Nova Cloud üzerinden şifreli yer imi ve parola eşitlemesini açıklayan Nova v1.5.2 Sync penceresi',
        width: 1440,
        height: 900,
        cropPosition: '50% 50%',
      },
    ],
    aboutLabel: 'Açık kaynak mimarisi',
    aboutFacts: [
      ['Lisans', 'MIT'],
      ['Sürüm', 'v1.5.2'],
      ['Platformlar', 'macOS, Windows, Linux'],
    ],
    aboutStatement: 'Nova, Electron süreç sınırlarından React arayüzüne ve yerel CRX3 eklenti kurucusuna kadar tamamen açık geliştirilir. Her değişikliği inceleyebilir, her izin kontrolünü doğrulayabilir veya kendi derlemeni GitHub üzerinden alabilirsin.',
    aboutAction: 'GitHub’da keşfet',
    aboutRowLabel: 'Mimari',
    aboutSpecsLeft: [
      ['Live Design Studio', '4 sekme geometrisi'],
      ['Yerel AI motoru', 'Cihazda WebGPU'],
      ['Ajan köprüsü', 'Yerleşik MCP sunucusu'],
      ['Eklentiler', 'Chrome Web Store CRX3'],
      ['Ağ koruması', 'Yerleşik reklam kalkanı'],
      ['Gizli sekmeler', 'Sekme bazlı yalıtım'],
    ],
    aboutSpecsRight: [
      ['Eşitleme şifrelemesi', 'AES-256-GCM'],
      ['Masaüstü çekirdeği', 'Electron ve React'],
      ['Kurulum paketleri', 'DMG, EXE, AppImage, DEB'],
      ['Arayüz dilleri', 'Türkçe ve İngilizce'],
      ['Kaynak lisansı', 'MIT açık kaynak'],
      ['Güncel sürüm', 'v1.5.2'],
    ],
    faqHeading: 'Merak edilenler.',
    faq: [
      [
        'Nova ücretsiz ve açık kaynak mı?',
        'Evet. Nova ücretsizdir ve MIT lisansı altında açık kaynak olarak sunulur. Tüm kaynak kodunu inceleyebilir, sorun bildirebilir veya GitHub üzerinden katkıda bulunabilirsin.',
      ],
      [
        'Hangi masaüstü sistemlerde çalışır?',
        'Apple Silicon ve Intel işlemcili macOS, Windows x64 (Kurulum ve Taşınabilir) ve Linux x64 (AppImage ve Debian/Ubuntu) için resmi v1.5.2 sürümleri sunulur.',
      ],
      [
        'Yerel WebGPU yapay zekâ nasıl çalışır?',
        'Desteklenen dil modelleri WebGPU aracılığıyla doğrudan cihazının ekran kartında çalışır. İlk kullanımdan önce bir model indirmen gerekir; hız ve destek grafik donanımına ve belleğe bağlıdır.',
      ],
      [
        'Chrome Web Store eklentilerini kullanabilir miyim?',
        'Evet. Mağaza sayfasından tek tıkla ya da eklenti bağlantısını ve 32 karakterli kimliğini Nova’ya yapıştırarak kurabilirsin. Uyumluluk eklentinin kullandığı Chrome API’lerine göre değişebilir.',
      ],
      [
        'Nova Sync verilerimi nasıl korur?',
        'Yer imlerin ve parolaların Nova Cloud hesabın üzerinden eşitlenmeden önce cihazında AES-256-GCM ile şifrelenir. Bu sürümde kodla ikinci cihaz eşleştirme özelliği bulunmamaktadır.',
      ],
      [
        'Tarayıcı arayüzünü ne kadar özelleştirebilirim?',
        'Live Design Studio ile üst, kompakt tek satır, adres çubuğu altı ve dikey kenar çubuğu düzenleri arasında geçebilir, araç çubuğu düğmelerini sürükleyip sıralayabilir ve çalışma alanına özel temalar tanımlayabilirsin.',
      ],
    ],
    downloadHeading: ['Nova’yı', 'indir.'],
    downloadLead: 'Resmi v1.5.2 kurulum paketlerini doğrudan GitHub Releases üzerinden indirmek için işletim sistemini seç.',
    allReleases: 'Tüm sürümler ve sağlama toplamları',
    installerHeading: 'Resmi v1.5.2 kurulum paketleri',
    installerSubheading: 'İşletim sistemini seç',
    desktopNote: 'Nova; macOS, Windows ve Linux için bir masaüstü tarayıcısıdır.',
    footerInvitation: ['Web senin', 'kalsın.'],
    footerAction: 'GitHub’da keşfet',
    footerLinks: ['Kaynak kodu', 'Sürüm notları', 'Sorun bildir'],
    footerNavLabel: 'Alt gezinme',
    footerLicense: 'MIT Açık Kaynak. Herkese açık geliştiriliyor.',
    backToTop: 'Başa dön',
    videoTitle: 'Nova v1.5.2 tanıtım filmi',
    videoDescription: 'Live Design Studio, çalışma alanları, yerel WebGPU yapay zekâ, Chrome Web Store eklentileri ve şifreli eşitlemeyi gösteren, Türkçe ve İngilizce altyazılı 42 saniyelik tanıtım filmi.',
    videoError: 'Video yüklenemedi. Bağlantını kontrol edip tekrar dene.',
    retryVideo: 'Videoyu yeniden dene',
    close: 'Kapat',
  },
}

export type Language = 'en' | 'tr' | 'ru' | 'de' | 'fr' | 'es';

export interface Translation {
  lang: Language;
  langName: string;
  flag: string;

  nav: {
    features: string;
    privacy: string;
    design: string;
    github: string;
    download: string;
    community: string;
  };

  hero: {
    badge: string;
    headline1: string;
    headline2: string;
    sub: string;
    downloadMac: string;
    downloadWin: string;
    viewSource: string;
  };

  stats: {
    title: string;
    subtitle: string;
    stars: string;
    forks: string;
    license: string;
    openSource: string;
    liveNote: string;
    viewGithub: string;
  };

  features: {
    badge: string;
    title1: string;
    title2: string;
    sub: string;
    items: {
      tabFolders: { title: string; desc: string };
      splitScreen: { title: string; desc: string };
      adBlocker: { title: string; desc: string };
      fast: { title: string; desc: string };
      privacy: { title: string; desc: string };
      workspaces: { title: string; desc: string };
    };
  };

  showcase: {
    badge: string;
    title: string;
    titleAccent: string;
    sub: string;
    items: Array<{
      badge: string;
      title: string;
      desc: string;
      highlights: string[];
    }>;
  };

  comparison: {
    badge: string;
    title: string;
    sub: string;
    recommended: string;
    disclaimer: string;
    features: string[];
  };

  community: {
    badge: string;
    title: string;
    sub: string;
    starTitle: string;
    starDesc: string;
    starCta: string;
    discussTitle: string;
    discussDesc: string;
    discussCta: string;
    issueTitle: string;
    issueDesc: string;
    issueCta: string;
    footer: string;
  };

  trust: {
    badge: string;
    title: string;
    sub: string;
    openSource: string;
    openSourceDesc: string;
    noTelemetry: string;
    noTelemetryDesc: string;
    noAccount: string;
    noAccountDesc: string;
    community: string;
    communityDesc: string;
    changelogBadge: string;
    changelogTitle: string;
    changelogSub: string;
    viewAll: string;
    latest: string;
    stable: string;
    launch: string;
  };

  faq: {
    badge: string;
    title: string;
    sub: string;
    askLink: string;
    items: Array<{ q: string; a: string }>;
  };

  cta: {
    title: string;
    sub: string;
    downloadMac: string;
    downloadWin: string;
    github: string;
  };

  footer: {
    privacy: string;
    terms: string;
    contact: string;
    copy: string;
  };
}

// ─── ENGLISH ────────────────────────────────────────────────────────────────
const en: Translation = {
  lang: 'en', langName: 'English', flag: '🇺🇸',
  nav: { features: 'Features', privacy: 'Privacy', design: 'Design', github: 'GitHub', download: 'Download', community: 'Community' },
  hero: {
    badge: 'Nova Browser 1.0 is now available',
    headline1: 'The internet,',
    headline2: 'reimagined for you.',
    sub: 'A productivity-first browser with built-in AI, native ad-blocking, and seamless split-screen workspaces. Fast, beautiful, and completely open source.',
    downloadMac: 'Download for Mac',
    downloadWin: 'Download for Windows',
    viewSource: 'View Source',
  },
  stats: {
    title: 'Real numbers, no marketing fluff',
    subtitle: 'GitHub stats are fetched live directly from the API.',
    stars: 'GitHub Stars', forks: 'Forks', license: 'MIT License', openSource: 'Open Source',
    liveNote: 'GitHub stats update in real time.', viewGithub: 'View on GitHub →',
  },
  features: {
    badge: 'Features',
    title1: 'Everything you need.',
    title2: "Nothing you don't.",
    sub: 'Nova is built from the ground up for productivity and privacy. Say goodbye to clutter and hello to focus.',
    items: {
      tabFolders: { title: 'Tab Folders', desc: 'Organize your digital life with native drag-and-drop tab folders. Keep work, research, and personal browsing perfectly separated.' },
      splitScreen: { title: 'Split Screen', desc: 'View two tabs side-by-side natively without opening new windows. Perfect for research, coding, or comparing documents.' },
      adBlocker: { title: 'Built-in Ad Blocker', desc: 'Experience a cleaner, faster web. Nova blocks trackers and intrusive ads at the network level by default.' },
      fast: { title: 'Lightning Fast', desc: 'Built on Electron and optimized for performance. Minimal memory footprint with suspended background tabs.' },
      privacy: { title: 'Privacy First', desc: "Your data stays yours. No telemetry, no tracking. We don't even know what you're browsing." },
      workspaces: { title: 'Workspaces', desc: 'Switch between entire contexts instantly. One click changes your tabs, bookmarks, and history context.' },
    },
  },
  showcase: {
    badge: 'Deep Dive', title: 'Built different,', titleAccent: 'on purpose',
    sub: "Every feature in Nova is designed to get out of your way and let you focus on what matters.",
    items: [
      { badge: 'AI Assistant', title: 'A browser that actually thinks for you', desc: "Ask your browser anything. Nova's built-in AI agent can navigate pages, fill forms, summarize articles, and complete multi-step tasks — all locally on your device.", highlights: ['Runs 100% locally via WebGPU (no API key needed)', 'Can click, scroll, and interact with any page', 'Persistent memory across sessions', 'Reads pages aloud with text-to-speech'] },
      { badge: 'Privacy Shield', title: 'Private by default, not by option', desc: 'Nova blocks ads, trackers, and malicious scripts at the network level before they even load. No extensions needed.', highlights: ['Blocks 95%+ of known ad networks', 'Fingerprinting protection built-in', 'Per-site whitelist control', 'Zero telemetry — we see nothing'] },
      { badge: 'Workspaces', title: 'Your whole context, one click away', desc: 'Switch between work, personal, and research browsing instantly. Each workspace has its own tabs, bookmarks, and history.', highlights: ['Color-coded workspace labels', 'Independent tab sessions per workspace', 'Drag-and-drop tab organization', 'Sync-free — everything stays local'] },
      { badge: 'Split Screen', title: 'Two pages, zero windows', desc: 'View any two tabs side-by-side in a single window. Research while you write. Code while you read the docs.', highlights: ['Native split view — no extensions', 'Adjustable split ratio', 'Works with any website', 'Keyboard shortcut support'] },
    ],
  },
  comparison: {
    badge: 'Why Nova?', title: 'See how we stack up', sub: "Nova isn't just another browser. It's built with features that others charge for or don't offer at all.",
    recommended: '✦ Recommended',
    disclaimer: 'Based on default configurations as of 2025. Some features may require extensions in other browsers.',
    features: ['Built-in Ad Blocker', 'Built-in AI Agent', 'Split Screen View', 'Tab Workspaces', 'Zero Telemetry', 'Open Source', 'Private Browsing Mode', 'Reader Mode', 'No Account Required', 'Free Forever'],
  },
  community: {
    badge: 'Community', title: 'Built in the open, together', sub: 'Nova is a community-driven project. Every feature, bug fix, and improvement happens publicly on GitHub.',
    starTitle: 'Star on GitHub', starDesc: 'If you find Nova useful, a star helps others discover it and motivates us to keep going.', starCta: 'Star the repo',
    discussTitle: 'Join the Discussion', discussDesc: 'Share feedback, request features, report bugs, or just say hi. All conversations happen openly on GitHub.', discussCta: 'Open a discussion',
    issueTitle: 'Share Your Feedback', issueDesc: "Tried Nova? We'd love to hear what you think — good or bad. Open an issue and let us know.", issueCta: 'Open an issue',
    footer: 'All development happens publicly at',
  },
  trust: {
    badge: 'Open & Honest', title: 'You can trust us — and verify it', sub: 'Because trust without transparency is just a marketing claim.',
    openSource: '100% Open Source', openSourceDesc: 'MIT License — read every line on GitHub',
    noTelemetry: 'Zero Telemetry', noTelemetryDesc: 'No analytics, no crash reports, nothing',
    noAccount: 'No Account Needed', noAccountDesc: 'Download and run. No sign-up ever.',
    community: 'Community Built', communityDesc: 'Shaped by users, for users',
    changelogBadge: 'Changelog', changelogTitle: 'Always improving', changelogSub: "We ship fast and often. Here's what's been landing.",
    viewAll: 'View full release history on GitHub →', latest: 'Latest', stable: 'Stable', launch: 'Launch',
  },
  faq: {
    badge: 'FAQ', title: 'Frequently asked questions', sub: "Everything you need to know before switching. Can't find the answer? Ask us on",
    askLink: 'GitHub Discussions',
    items: [
      { q: 'Is Nova Browser really free?', a: 'Yes, completely. Nova is open source under the MIT license. There are no premium tiers, subscriptions, or hidden costs.' },
      { q: 'Is it based on Chromium?', a: "Nova is built on Electron, which uses Chromium under the hood. Unlike Chrome, we strip out all Google tracking and telemetry." },
      { q: 'Does Nova collect any data about me?', a: "Absolutely not. Nova has zero telemetry. We don't collect crash reports, usage analytics, or any personal data. Everything stays on your machine." },
      { q: 'How does the built-in AI work?', a: "Nova's AI runs entirely locally on your device using WebGPU. It downloads the model once and then operates completely offline. No API keys, no cloud processing." },
      { q: 'Can I import bookmarks from Chrome or Firefox?', a: 'Yes! Nova supports importing bookmarks from any browser that can export a standard HTML bookmarks file. Go to Settings → Import.' },
      { q: 'Does Nova support Chrome extensions?', a: "Nova has basic extension support. Since it's built on Electron/Chromium, many Chrome extensions can be loaded manually." },
      { q: 'What platforms does Nova support?', a: 'Currently macOS (Apple Silicon & Intel) and Windows. Linux support is planned for a future release.' },
      { q: 'How do I contribute or report a bug?', a: 'Head over to our GitHub repository. We welcome pull requests, bug reports, and feature suggestions.' },
    ],
  },
  cta: {
    title: 'Ready to take back control of your browser?',
    sub: 'Join thousands of users who have switched to Nova for a faster, cleaner, and more private web experience. Fully open source and free forever.',
    downloadMac: 'Download for Mac', downloadWin: 'Download for Windows', github: 'Star on GitHub',
  },
  footer: { privacy: 'Privacy Policy', terms: 'Terms of Service', contact: 'Contact', copy: 'Nova Browser. Open Source.' },
};

// ─── TURKISH ────────────────────────────────────────────────────────────────
const tr: Translation = {
  lang: 'tr', langName: 'Türkçe', flag: '🇹🇷',
  nav: { features: 'Özellikler', privacy: 'Gizlilik', design: 'Tasarım', github: 'GitHub', download: 'İndir', community: 'Topluluk' },
  hero: {
    badge: 'Nova Browser 1.0 artık kullanıma hazır',
    headline1: 'İnternet,',
    headline2: 'senin için yeniden tasarlandı.',
    sub: 'Yerleşik yapay zeka, reklam engelleme ve bölünmüş ekran çalışma alanlarıyla üretkenlik odaklı bir tarayıcı. Hızlı, güzel ve tamamen açık kaynak.',
    downloadMac: "Mac'te İndir",
    downloadWin: "Windows'ta İndir",
    viewSource: 'Kaynak Kodu',
  },
  stats: {
    title: 'Gerçek rakamlar, pazarlama yalanı yok',
    subtitle: 'GitHub istatistikleri doğrudan API\'den anlık olarak çekilmektedir.',
    stars: 'GitHub Yıldızı', forks: 'Fork', license: 'MIT Lisansı', openSource: 'Açık Kaynak',
    liveNote: 'GitHub istatistikleri anlık güncellenir.', viewGithub: "GitHub'da Görüntüle →",
  },
  features: {
    badge: 'Özellikler',
    title1: 'İhtiyacın olan her şey.',
    title2: 'İhtiyacın olmayan hiçbir şey.',
    sub: 'Nova, üretkenlik ve gizlilik için sıfırdan inşa edilmiştir. Kargaşaya elveda, odaklanmaya merhaba.',
    items: {
      tabFolders: { title: 'Sekme Klasörleri', desc: 'Sekmeleri sürükle-bırak klasörlerle düzenle. İş, araştırma ve kişisel gezinmeyi birbirinden ayır.' },
      splitScreen: { title: 'Bölünmüş Ekran', desc: 'İki sekmeyi yan yana görüntüle. Araştırma, kodlama veya belge karşılaştırma için mükemmel.' },
      adBlocker: { title: 'Yerleşik Reklam Engelleyici', desc: 'Nova, izleyicileri ve rahatsız edici reklamları ağ seviyesinde varsayılan olarak engeller.' },
      fast: { title: 'Şimşek Hızı', desc: "Electron üzerine inşa edilmiş, performans için optimize edilmiştir. Arka plan sekmeleri askıya alınarak minimum bellek kullanımı." },
      privacy: { title: 'Önce Gizlilik', desc: 'Verileriniz sizde kalır. Telemetri yok, izleme yok. Ne gezdiğinizi bile bilmiyoruz.' },
      workspaces: { title: 'Çalışma Alanları', desc: 'Tüm bağlamlar arasında anında geçiş yap. Bir tıklamayla sekmeler, yer imleri ve geçmiş değişir.' },
    },
  },
  showcase: {
    badge: 'Derinlemesine', title: 'Farklı inşa edildi,', titleAccent: 'kasıtlı olarak',
    sub: "Nova'daki her özellik, yolunuzdan çekilip önemli olana odaklanmanızı sağlamak için tasarlandı.",
    items: [
      { badge: 'Yapay Zeka Asistanı', title: 'Gerçekten senin için düşünen bir tarayıcı', desc: "Tarayıcına her şeyi sor. Nova'nın yerleşik yapay zeka ajanı sayfaları gezebilir, formları doldurabilir, makaleleri özetleyebilir — tamamı cihazınızda yerel olarak.", highlights: ['WebGPU ile %100 yerel çalışır (API anahtarı gerekmez)', 'Herhangi bir sayfayla tıklayıp etkileşime girebilir', 'Oturumlar arası kalıcı bellek', 'Seslendirme (text-to-speech) desteği'] },
      { badge: 'Gizlilik Kalkanı', title: 'Varsayılan olarak gizli, seçenek olarak değil', desc: 'Nova, reklamları, izleyicileri ve kötü amaçlı komut dosyalarını yüklenmeden önce ağ seviyesinde engeller.', highlights: ['Bilinen reklam ağlarının %95\'ini engeller', 'Yerleşik parmak izi koruması', 'Site başına beyaz liste kontrolü', 'Sıfır telemetri — hiçbir şey görmüyoruz'] },
      { badge: 'Çalışma Alanları', title: 'Tüm bağlamın, tek tıklama uzakta', desc: 'İş, kişisel ve araştırma taraması arasında anında geçiş yap. Her çalışma alanının kendi sekmeleri, yer imleri ve geçmişi var.', highlights: ['Renk kodlu çalışma alanı etiketleri', 'Çalışma alanı başına bağımsız sekme oturumları', 'Sürükle-bırak sekme organizasyonu', 'Senkronizasyon yok — her şey yerel kalır'] },
      { badge: 'Bölünmüş Ekran', title: 'İki sayfa, sıfır pencere', desc: 'Tek pencerede herhangi iki sekmeyi yan yana görüntüle. Yazarken araştır. Dokümanları okurken kodla.', highlights: ['Uzantı gerektirmeyen yerel bölünmüş görünüm', 'Ayarlanabilir bölme oranı', 'Her web sitesiyle çalışır', 'Klavye kısayolu desteği'] },
    ],
  },
  comparison: {
    badge: 'Neden Nova?', title: 'Nasıl karşılaştırıyoruz', sub: "Nova sadece başka bir tarayıcı değil. Diğerlerinin ücret aldığı ya da sunmadığı özelliklerle donatılmış.",
    recommended: '✦ Önerilen',
    disclaimer: '2025 itibarıyla varsayılan yapılandırmalara dayalıdır. Bazı özellikler diğer tarayıcılarda eklenti gerektirebilir.',
    features: ['Yerleşik Reklam Engelleyici', 'Yerleşik Yapay Zeka', 'Bölünmüş Ekran Görünümü', 'Sekme Çalışma Alanları', 'Sıfır Telemetri', 'Açık Kaynak', 'Gizli Gezinme Modu', 'Okuyucu Modu', 'Hesap Gerekmez', 'Sonsuza Kadar Ücretsiz'],
  },
  community: {
    badge: 'Topluluk', title: 'Açıkta, birlikte inşa edildi', sub: "Nova topluluk odaklı bir projedir. Her özellik, hata düzeltmesi ve iyileştirme GitHub'da herkese açık gerçekleşir.",
    starTitle: "GitHub'da Yıldızla", starDesc: "Nova'yı faydalı buluyorsan, bir yıldız başkalarının keşfetmesine yardımcı olur ve bizi motive eder.", starCta: 'Repoyu yıldızla',
    discussTitle: 'Tartışmaya Katıl', discussDesc: "Geri bildirim paylaş, özellik talep et, hata bildir ya da sadece merhaba de. Tüm konuşmalar GitHub'da açık gerçekleşir.", discussCta: 'Tartışma aç',
    issueTitle: 'Geri Bildirim Paylaş', issueDesc: "Nova'yı denedin mi? İyi ya da kötü, düşüncelerini duymak isteriz. Bir sorun aç ve bize bildir.", issueCta: 'Sorun aç',
    footer: 'Tüm geliştirme kamuya açık olarak',
  },
  trust: {
    badge: 'Açık ve Dürüst', title: 'Bize güvenebilirsin — ve doğrulayabilirsin', sub: 'Çünkü şeffaflık olmadan güven sadece bir pazarlama iddiasıdır.',
    openSource: '%100 Açık Kaynak', openSourceDesc: "MIT Lisansı — her satırı GitHub'da oku",
    noTelemetry: 'Sıfır Telemetri', noTelemetryDesc: 'Analitik yok, kilitlenme raporu yok, hiçbir şey yok',
    noAccount: 'Hesap Gerekmez', noAccountDesc: 'İndir ve çalıştır. Hiçbir zaman kayıt olmak zorunda değilsin.',
    community: 'Topluluk Yapımı', communityDesc: 'Kullanıcılar tarafından, kullanıcılar için şekillendirildi',
    changelogBadge: 'Değişiklik Günlüğü', changelogTitle: 'Sürekli gelişiyor', changelogSub: "Hızlı ve sık gönderim yapıyoruz. İşte son gelenler.",
    viewAll: "Tam sürüm geçmişini GitHub'da görüntüle →", latest: 'Son Sürüm', stable: 'Stabil', launch: 'Lansman',
  },
  faq: {
    badge: 'SSS', title: 'Sık sorulan sorular', sub: "Geçiş yapmadan önce bilmeniz gereken her şey. Cevabı bulamadınız mı? Bize",
    askLink: "GitHub Discussions'da sorun",
    items: [
      { q: 'Nova Browser gerçekten ücretsiz mi?', a: 'Evet, tamamen. Nova, MIT lisansı altında açık kaynaklıdır. Premium katmanlar, abonelikler veya gizli maliyetler yoktur.' },
      { q: 'Chromium tabanlı mı?', a: "Nova, Electron üzerine kurulmuştur ve bu da Chromium'u kullanır. Chrome'dan farklı olarak tüm Google izleme ve telemetrisini kaldırıyoruz." },
      { q: 'Nova hakkımda veri topluyor mu?', a: "Kesinlikle hayır. Nova'nın sıfır telemetrisi vardır. Kilitlenme raporları, kullanım analitiği veya kişisel veriler toplamıyoruz." },
      { q: 'Yerleşik yapay zeka nasıl çalışıyor?', a: "Nova'nın yapay zekası, WebGPU kullanarak tamamen cihazınızda yerel olarak çalışır. Modeli bir kez indirir ve tamamen çevrimdışı çalışır. API anahtarı yok." },
      { q: "Chrome veya Firefox'tan yer imlerimi içe aktarabilir miyim?", a: 'Evet! Nova, standart HTML yer imleri dosyası dışa aktarabilen herhangi bir tarayıcıdan yer imleri içe aktarmayı destekler.' },
      { q: 'Nova Chrome uzantılarını destekliyor mu?', a: "Nova temel uzantı desteğine sahiptir. Electron/Chromium üzerine kurulu olduğundan, birçok Chrome uzantısı manuel olarak yüklenebilir." },
      { q: 'Nova hangi platformları destekliyor?', a: 'Şu anda macOS (Apple Silicon ve Intel) ve Windows. Linux desteği gelecek sürüm için planlanmıştır.' },
      { q: 'Nasıl katkıda bulunabilirim veya hata bildirebilirim?', a: "GitHub depomuzda pull request, hata raporu ve özellik önerilerine hoş geldiniz." },
    ],
  },
  cta: {
    title: 'Tarayıcın kontrolünü geri almaya hazır mısın?',
    sub: "Daha hızlı, daha temiz ve daha gizli bir web deneyimi için Nova'ya geçen binlerce kullanıcıya katıl. Sonsuza kadar açık kaynak ve ücretsiz.",
    downloadMac: "Mac'te İndir", downloadWin: "Windows'ta İndir", github: "GitHub'da Yıldızla",
  },
  footer: { privacy: 'Gizlilik Politikası', terms: 'Kullanım Koşulları', contact: 'İletişim', copy: 'Nova Browser. Açık Kaynak.' },
};

// ─── RUSSIAN ────────────────────────────────────────────────────────────────
const ru: Translation = {
  lang: 'ru', langName: 'Русский', flag: '🇷🇺',
  nav: { features: 'Функции', privacy: 'Конфиденциальность', design: 'Дизайн', github: 'GitHub', download: 'Скачать', community: 'Сообщество' },
  hero: {
    badge: 'Nova Browser 1.0 уже доступен',
    headline1: 'Интернет,',
    headline2: 'переосмысленный для вас.',
    sub: 'Браузер для продуктивности со встроенным ИИ, блокировкой рекламы и разделённым экраном. Быстрый, красивый и полностью открытый.',
    downloadMac: 'Скачать для Mac',
    downloadWin: 'Скачать для Windows',
    viewSource: 'Исходный код',
  },
  stats: {
    title: 'Реальные цифры, без маркетинга',
    subtitle: 'Статистика GitHub загружается напрямую из API в реальном времени.',
    stars: 'Звёзды GitHub', forks: 'Форки', license: 'Лицензия MIT', openSource: 'Открытый код',
    liveNote: 'Статистика GitHub обновляется в реальном времени.', viewGithub: 'Смотреть на GitHub →',
  },
  features: {
    badge: 'Функции',
    title1: 'Всё что нужно.',
    title2: 'Ничего лишнего.',
    sub: 'Nova создан с нуля для продуктивности и конфиденциальности. Прощай хаос, привет фокус.',
    items: {
      tabFolders: { title: 'Папки вкладок', desc: 'Организуйте вкладки с помощью перетаскиваемых папок. Разделяйте работу, исследования и личный серфинг.' },
      splitScreen: { title: 'Разделённый экран', desc: 'Просматривайте две вкладки рядом без открытия новых окон. Идеально для исследований и кодирования.' },
      adBlocker: { title: 'Встроенный блокировщик рекламы', desc: 'Nova блокирует трекеры и навязчивую рекламу на сетевом уровне по умолчанию.' },
      fast: { title: 'Молниеносная скорость', desc: 'Построен на Electron и оптимизирован для производительности. Минимальный расход памяти.' },
      privacy: { title: 'Сначала конфиденциальность', desc: 'Ваши данные остаются у вас. Никакой телеметрии, никакой слежки. Мы не знаем, что вы просматриваете.' },
      workspaces: { title: 'Рабочие пространства', desc: 'Мгновенно переключайтесь между контекстами. Один клик меняет вкладки, закладки и историю.' },
    },
  },
  showcase: {
    badge: 'Подробнее', title: 'Создано по-другому,', titleAccent: 'намеренно',
    sub: 'Каждая функция Nova разработана, чтобы не мешать вам и позволить сосредоточиться на главном.',
    items: [
      { badge: 'ИИ-ассистент', title: 'Браузер, который думает за вас', desc: 'Спросите браузер о чём угодно. Встроенный ИИ-агент Nova может открывать страницы, заполнять формы, суммировать статьи — всё локально на вашем устройстве.', highlights: ['Работает 100% локально через WebGPU (без API-ключа)', 'Может кликать, прокручивать и взаимодействовать со страницами', 'Постоянная память между сессиями', 'Чтение страниц вслух (text-to-speech)'] },
      { badge: 'Щит конфиденциальности', title: 'Приватно по умолчанию, не по выбору', desc: 'Nova блокирует рекламу, трекеры и вредоносные скрипты на сетевом уровне до их загрузки.', highlights: ['Блокирует 95%+ известных рекламных сетей', 'Встроенная защита от фингерпринтинга', 'Белый список для каждого сайта', 'Нулевая телеметрия — мы ничего не видим'] },
      { badge: 'Рабочие пространства', title: 'Весь контекст, в один клик', desc: 'Мгновенно переключайтесь между работой, личным и исследовательским серфингом. Каждое рабочее пространство имеет свои вкладки, закладки и историю.', highlights: ['Цветные метки рабочих пространств', 'Независимые сессии вкладок', 'Организация перетаскиванием', 'Без синхронизации — всё локально'] },
      { badge: 'Разделённый экран', title: 'Две страницы, ноль окон', desc: 'Просматривайте любые две вкладки рядом в одном окне. Исследуйте пока пишете. Читайте документацию пока кодируете.', highlights: ['Нативный вид без расширений', 'Настраиваемое соотношение разделения', 'Работает с любым сайтом', 'Поддержка горячих клавиш'] },
    ],
  },
  comparison: {
    badge: 'Почему Nova?', title: 'Посмотрите на сравнение', sub: 'Nova — это не просто ещё один браузер. Он оснащён функциями, за которые другие берут деньги или вовсе не предлагают.',
    recommended: '✦ Рекомендуем',
    disclaimer: 'На основе конфигураций по умолчанию на 2025 год. Для некоторых функций в других браузерах могут потребоваться расширения.',
    features: ['Встроенный блокировщик рекламы', 'Встроенный ИИ', 'Разделённый экран', 'Рабочие пространства', 'Нулевая телеметрия', 'Открытый исходный код', 'Режим инкогнито', 'Режим чтения', 'Без аккаунта', 'Бесплатно навсегда'],
  },
  community: {
    badge: 'Сообщество', title: 'Создано открыто, вместе', sub: 'Nova — проект, основанный на сообществе. Каждая функция и исправление происходят публично на GitHub.',
    starTitle: 'Поставьте звезду на GitHub', starDesc: 'Если Nova вам полезен, звезда помогает другим найти его и мотивирует нас продолжать.', starCta: 'Поставить звезду',
    discussTitle: 'Присоединяйтесь к обсуждению', discussDesc: 'Делитесь отзывами, запрашивайте функции, сообщайте об ошибках или просто поздоровайтесь.', discussCta: 'Открыть обсуждение',
    issueTitle: 'Поделитесь отзывом', issueDesc: 'Попробовали Nova? Мы хотим услышать ваше мнение — хорошее или плохое.', issueCta: 'Открыть issue',
    footer: 'Всё разработка происходит публично на',
  },
  trust: {
    badge: 'Открыто и честно', title: 'Вы можете доверять нам — и проверить', sub: 'Потому что доверие без прозрачности — это просто маркетинговое заявление.',
    openSource: '100% открытый код', openSourceDesc: 'Лицензия MIT — читайте каждую строку на GitHub',
    noTelemetry: 'Нулевая телеметрия', noTelemetryDesc: 'Никакой аналитики, никаких отчётов об ошибках',
    noAccount: 'Аккаунт не нужен', noAccountDesc: 'Скачайте и запустите. Никакой регистрации.',
    community: 'Создано сообществом', communityDesc: 'Создано пользователями, для пользователей',
    changelogBadge: 'История изменений', changelogTitle: 'Постоянно улучшается', changelogSub: 'Мы выпускаем обновления быстро и часто. Вот что появилось.',
    viewAll: 'Смотреть полную историю релизов на GitHub →', latest: 'Последний', stable: 'Стабильный', launch: 'Запуск',
  },
  faq: {
    badge: 'FAQ', title: 'Часто задаваемые вопросы', sub: 'Всё, что нужно знать перед переходом. Не нашли ответ? Спросите нас на',
    askLink: 'GitHub Discussions',
    items: [
      { q: 'Nova Browser действительно бесплатный?', a: 'Да, полностью. Nova — открытый исходный код под лицензией MIT. Никаких платных уровней, подписок или скрытых затрат.' },
      { q: 'Он основан на Chromium?', a: 'Nova построен на Electron, который использует Chromium. В отличие от Chrome, мы удалили всю телеметрию и слежку Google.' },
      { q: 'Nova собирает данные обо мне?', a: 'Абсолютно нет. Nova имеет нулевую телеметрию. Мы не собираем отчёты о сбоях, аналитику или личные данные.' },
      { q: 'Как работает встроенный ИИ?', a: 'ИИ Nova работает полностью локально на вашем устройстве через WebGPU. Он загружает модель один раз и работает полностью в офлайн-режиме.' },
      { q: 'Могу ли я импортировать закладки из Chrome или Firefox?', a: 'Да! Nova поддерживает импорт закладок из любого браузера, который может экспортировать стандартный HTML-файл закладок.' },
      { q: 'Nova поддерживает расширения Chrome?', a: 'Nova имеет базовую поддержку расширений. Поскольку он построен на Electron/Chromium, многие расширения Chrome можно загружать вручную.' },
      { q: 'Какие платформы поддерживает Nova?', a: 'В настоящее время macOS (Apple Silicon и Intel) и Windows. Поддержка Linux запланирована на будущий выпуск.' },
      { q: 'Как я могу внести вклад или сообщить об ошибке?', a: 'Перейдите на наш репозиторий GitHub. Мы приветствуем запросы на слияние, отчёты об ошибках и предложения функций.' },
    ],
  },
  cta: {
    title: 'Готовы взять под контроль свой браузер?',
    sub: 'Присоединяйтесь к тысячам пользователей, перешедших на Nova для более быстрого, чистого и приватного веб-опыта. Полностью открытый исходный код и бесплатно навсегда.',
    downloadMac: 'Скачать для Mac', downloadWin: 'Скачать для Windows', github: 'Поставить звезду на GitHub',
  },
  footer: { privacy: 'Политика конфиденциальности', terms: 'Условия использования', contact: 'Контакты', copy: 'Nova Browser. Открытый исходный код.' },
};

// ─── GERMAN ────────────────────────────────────────────────────────────────
const de: Translation = {
  lang: 'de', langName: 'Deutsch', flag: '🇩🇪',
  nav: { features: 'Funktionen', privacy: 'Datenschutz', design: 'Design', github: 'GitHub', download: 'Herunterladen', community: 'Community' },
  hero: {
    badge: 'Nova Browser 1.0 ist jetzt verfügbar',
    headline1: 'Das Internet,',
    headline2: 'für dich neu gedacht.',
    sub: 'Ein produktivitätsorientierter Browser mit KI, nativem Werbeblocker und nahtlosem Split-Screen. Schnell, schön und vollständig Open Source.',
    downloadMac: 'Für Mac herunterladen',
    downloadWin: 'Für Windows herunterladen',
    viewSource: 'Quellcode ansehen',
  },
  stats: {
    title: 'Echte Zahlen, kein Marketing-Bluff',
    subtitle: 'GitHub-Statistiken werden direkt aus der API in Echtzeit abgerufen.',
    stars: 'GitHub-Sterne', forks: 'Forks', license: 'MIT-Lizenz', openSource: 'Open Source',
    liveNote: 'GitHub-Statistiken werden in Echtzeit aktualisiert.', viewGithub: 'Auf GitHub anzeigen →',
  },
  features: {
    badge: 'Funktionen',
    title1: 'Alles was du brauchst.',
    title2: 'Nichts was du nicht brauchst.',
    sub: 'Nova wurde von Grund auf für Produktivität und Datenschutz entwickelt.',
    items: {
      tabFolders: { title: 'Tab-Ordner', desc: 'Organisiere dein digitales Leben mit Drag-and-Drop Tab-Ordnern. Trenne Arbeit, Recherche und persönliches Surfen.' },
      splitScreen: { title: 'Geteilter Bildschirm', desc: 'Zeige zwei Tabs nebeneinander an. Perfekt für Recherche, Programmierung oder den Vergleich von Dokumenten.' },
      adBlocker: { title: 'Eingebauter Werbeblocker', desc: 'Nova blockiert Tracker und aufdringliche Werbung standardmäßig auf Netzwerkebene.' },
      fast: { title: 'Blitzschnell', desc: 'Auf Electron aufgebaut und für Leistung optimiert. Minimaler Speicherverbrauch.' },
      privacy: { title: 'Datenschutz zuerst', desc: 'Deine Daten bleiben deine. Keine Telemetrie, kein Tracking. Wir wissen nicht mal, was du surfst.' },
      workspaces: { title: 'Arbeitsbereiche', desc: 'Wechsle sofort zwischen ganzen Kontexten. Ein Klick ändert Tabs, Lesezeichen und Verlauf.' },
    },
  },
  showcase: {
    badge: 'Details', title: 'Anders gebaut,', titleAccent: 'absichtlich',
    sub: 'Jede Funktion in Nova ist darauf ausgelegt, dir nicht im Weg zu stehen und dich auf das Wesentliche zu fokussieren.',
    items: [
      { badge: 'KI-Assistent', title: 'Ein Browser, der wirklich für dich denkt', desc: 'Frage deinen Browser alles. Der eingebaute KI-Agent von Nova kann Seiten navigieren, Formulare ausfüllen, Artikel zusammenfassen — alles lokal auf deinem Gerät.', highlights: ['Läuft 100% lokal via WebGPU (kein API-Schlüssel nötig)', 'Kann klicken, scrollen und mit jeder Seite interagieren', 'Dauerhafter Speicher zwischen Sitzungen', 'Vorlesen von Seiten per Text-to-Speech'] },
      { badge: 'Datenschutzschild', title: 'Privat standardmäßig, nicht optional', desc: 'Nova blockiert Werbung, Tracker und bösartige Skripte auf Netzwerkebene bevor sie geladen werden.', highlights: ['Blockiert 95%+ bekannter Werbenetzwerke', 'Eingebauter Fingerprint-Schutz', 'Pro-Website Whitelist-Kontrolle', 'Null Telemetrie — wir sehen nichts'] },
      { badge: 'Arbeitsbereiche', title: 'Dein ganzer Kontext, einen Klick entfernt', desc: 'Wechsle sofort zwischen Arbeit, Privat und Recherche. Jeder Arbeitsbereich hat eigene Tabs, Lesezeichen und Verlauf.', highlights: ['Farbkodierte Arbeitsbereich-Labels', 'Unabhängige Tab-Sitzungen', 'Drag-and-Drop Tab-Organisation', 'Kein Sync — alles bleibt lokal'] },
      { badge: 'Geteilter Bildschirm', title: 'Zwei Seiten, kein Fenster', desc: 'Zeige beliebige zwei Tabs nebeneinander in einem Fenster an. Recherchiere während du schreibst.', highlights: ['Nativer Split-View ohne Erweiterungen', 'Einstellbares Split-Verhältnis', 'Funktioniert mit jeder Website', 'Tastaturkürzel-Unterstützung'] },
    ],
  },
  comparison: {
    badge: 'Warum Nova?', title: 'Vergleich im Überblick', sub: 'Nova ist nicht nur ein weiterer Browser. Er bietet Funktionen, für die andere zahlen müssen oder die sie gar nicht anbieten.',
    recommended: '✦ Empfohlen',
    disclaimer: 'Basierend auf Standardkonfigurationen von 2025. Einige Funktionen erfordern in anderen Browsern Erweiterungen.',
    features: ['Eingebauter Werbeblocker', 'Eingebaute KI', 'Geteilter Bildschirm', 'Tab-Arbeitsbereiche', 'Null Telemetrie', 'Open Source', 'Privater Modus', 'Lesemodus', 'Kein Konto erforderlich', 'Für immer kostenlos'],
  },
  community: {
    badge: 'Community', title: 'Offen gebaut, gemeinsam', sub: 'Nova ist ein gemeinschaftsgetriebenes Projekt. Jede Funktion und jede Verbesserung passiert öffentlich auf GitHub.',
    starTitle: 'Auf GitHub markieren', starDesc: 'Wenn du Nova nützlich findest, hilft ein Stern anderen, es zu entdecken.', starCta: 'Repo markieren',
    discussTitle: 'An Diskussion teilnehmen', discussDesc: 'Feedback teilen, Funktionen anfragen, Fehler melden oder einfach Hallo sagen.', discussCta: 'Diskussion öffnen',
    issueTitle: 'Feedback teilen', issueDesc: 'Nova ausprobiert? Wir möchten hören, was du denkst — gut oder schlecht.', issueCta: 'Issue öffnen',
    footer: 'Die gesamte Entwicklung findet öffentlich auf',
  },
  trust: {
    badge: 'Offen & Ehrlich', title: 'Du kannst uns vertrauen — und es überprüfen', sub: 'Denn Vertrauen ohne Transparenz ist nur eine Marketingaussage.',
    openSource: '100% Open Source', openSourceDesc: 'MIT-Lizenz — jede Zeile auf GitHub lesen',
    noTelemetry: 'Null Telemetrie', noTelemetryDesc: 'Keine Analyse, keine Absturzberichte, nichts',
    noAccount: 'Kein Konto nötig', noAccountDesc: 'Herunterladen und ausführen. Niemals anmelden.',
    community: 'Community-Projekt', communityDesc: 'Von Nutzern für Nutzer gestaltet',
    changelogBadge: 'Änderungsprotokoll', changelogTitle: 'Immer besser', changelogSub: 'Wir liefern schnell und oft. Hier ist was neu ist.',
    viewAll: 'Vollständige Versionshistorie auf GitHub →', latest: 'Aktuell', stable: 'Stabil', launch: 'Launch',
  },
  faq: {
    badge: 'FAQ', title: 'Häufig gestellte Fragen', sub: 'Alles was du vor dem Wechsel wissen musst. Keine Antwort gefunden? Frag uns auf',
    askLink: 'GitHub Discussions',
    items: [
      { q: 'Ist Nova Browser wirklich kostenlos?', a: 'Ja, vollständig. Nova ist Open Source unter der MIT-Lizenz. Keine Premium-Stufen, keine Abonnements, keine versteckten Kosten.' },
      { q: 'Basiert es auf Chromium?', a: 'Nova ist auf Electron aufgebaut, das Chromium verwendet. Anders als Chrome entfernen wir alle Google-Tracking- und Telemetriefunktionen.' },
      { q: 'Sammelt Nova Daten über mich?', a: 'Absolut nicht. Nova hat null Telemetrie. Wir sammeln keine Absturzberichte, Nutzungsanalysen oder persönliche Daten.' },
      { q: 'Wie funktioniert die eingebaute KI?', a: 'Die KI von Nova läuft vollständig lokal auf deinem Gerät über WebGPU. Sie lädt das Modell einmal herunter und arbeitet dann komplett offline.' },
      { q: 'Kann ich Lesezeichen aus Chrome oder Firefox importieren?', a: 'Ja! Nova unterstützt den Import von Lesezeichen aus jedem Browser, der eine Standard-HTML-Lesezeichendatei exportieren kann.' },
      { q: 'Unterstützt Nova Chrome-Erweiterungen?', a: 'Nova hat grundlegende Erweiterungsunterstützung. Da es auf Electron/Chromium aufgebaut ist, können viele Chrome-Erweiterungen manuell geladen werden.' },
      { q: 'Welche Plattformen unterstützt Nova?', a: 'Derzeit macOS (Apple Silicon & Intel) und Windows. Linux-Unterstützung ist für eine zukünftige Version geplant.' },
      { q: 'Wie kann ich beitragen oder einen Fehler melden?', a: 'Besuche unser GitHub-Repository. Wir begrüßen Pull Requests, Fehlerberichte und Funktionsvorschläge.' },
    ],
  },
  cta: {
    title: 'Bereit, die Kontrolle über deinen Browser zurückzugewinnen?',
    sub: 'Schließe dich Tausenden von Nutzern an, die zu Nova gewechselt haben. Vollständig Open Source und für immer kostenlos.',
    downloadMac: 'Für Mac herunterladen', downloadWin: 'Für Windows herunterladen', github: 'Auf GitHub markieren',
  },
  footer: { privacy: 'Datenschutzrichtlinie', terms: 'Nutzungsbedingungen', contact: 'Kontakt', copy: 'Nova Browser. Open Source.' },
};

// ─── FRENCH ────────────────────────────────────────────────────────────────
const fr: Translation = {
  lang: 'fr', langName: 'Français', flag: '🇫🇷',
  nav: { features: 'Fonctionnalités', privacy: 'Confidentialité', design: 'Design', github: 'GitHub', download: 'Télécharger', community: 'Communauté' },
  hero: {
    badge: 'Nova Browser 1.0 est maintenant disponible',
    headline1: 'Internet,',
    headline2: 'réimaginé pour vous.',
    sub: 'Un navigateur axé sur la productivité avec IA intégrée, bloqueur de publicités natif et écran partagé. Rapide, beau et entièrement open source.',
    downloadMac: 'Télécharger pour Mac',
    downloadWin: 'Télécharger pour Windows',
    viewSource: 'Voir le code source',
  },
  stats: {
    title: 'Des vrais chiffres, sans bullshit marketing',
    subtitle: "Les statistiques GitHub sont récupérées directement depuis l'API en temps réel.",
    stars: 'Étoiles GitHub', forks: 'Forks', license: 'Licence MIT', openSource: 'Open Source',
    liveNote: 'Les statistiques GitHub se mettent à jour en temps réel.', viewGithub: 'Voir sur GitHub →',
  },
  features: {
    badge: 'Fonctionnalités',
    title1: 'Tout ce dont vous avez besoin.',
    title2: "Rien de superflu.",
    sub: 'Nova est construit de zéro pour la productivité et la confidentialité.',
    items: {
      tabFolders: { title: 'Dossiers d\'onglets', desc: 'Organisez votre vie numérique avec des dossiers d\'onglets glisser-déposer. Séparez travail, recherche et navigation personnelle.' },
      splitScreen: { title: 'Écran partagé', desc: 'Affichez deux onglets côte à côte. Parfait pour la recherche, le codage ou la comparaison de documents.' },
      adBlocker: { title: 'Bloqueur de publicités intégré', desc: 'Nova bloque les traqueurs et les publicités intrusives au niveau réseau par défaut.' },
      fast: { title: 'Ultra rapide', desc: 'Construit sur Electron et optimisé pour les performances. Empreinte mémoire minimale.' },
      privacy: { title: 'La confidentialité d\'abord', desc: 'Vos données restent les vôtres. Pas de télémétrie, pas de suivi. Nous ne savons même pas ce que vous naviguez.' },
      workspaces: { title: 'Espaces de travail', desc: 'Passez instantanément d\'un contexte à l\'autre. Un clic change vos onglets, favoris et historique.' },
    },
  },
  showcase: {
    badge: 'En détail', title: 'Conçu différemment,', titleAccent: 'intentionnellement',
    sub: "Chaque fonctionnalité de Nova est conçue pour s'effacer et vous laisser vous concentrer sur l'essentiel.",
    items: [
      { badge: 'Assistant IA', title: 'Un navigateur qui pense vraiment pour vous', desc: "Demandez n'importe quoi à votre navigateur. L'agent IA intégré de Nova peut naviguer, remplir des formulaires, résumer des articles — tout localement.", highlights: ['Fonctionne 100% localement via WebGPU (pas de clé API)', 'Peut cliquer, défiler et interagir avec n\'importe quelle page', 'Mémoire persistante entre les sessions', 'Lecture des pages à voix haute (text-to-speech)'] },
      { badge: 'Bouclier de confidentialité', title: 'Privé par défaut, pas en option', desc: 'Nova bloque les publicités, traqueurs et scripts malveillants au niveau réseau avant même qu\'ils se chargent.', highlights: ['Bloque 95%+ des réseaux publicitaires connus', 'Protection contre le fingerprinting intégrée', 'Contrôle de la liste blanche par site', 'Télémétrie zéro — nous ne voyons rien'] },
      { badge: 'Espaces de travail', title: 'Tout votre contexte, à un clic', desc: 'Passez instantanément entre travail, personnel et recherche. Chaque espace de travail a ses propres onglets, favoris et historique.', highlights: ['Étiquettes d\'espace de travail codées par couleur', 'Sessions d\'onglets indépendantes', 'Organisation par glisser-déposer', 'Sans synchronisation — tout reste local'] },
      { badge: 'Écran partagé', title: 'Deux pages, zéro fenêtre', desc: 'Affichez deux onglets côte à côte dans une seule fenêtre. Recherchez pendant que vous écrivez.', highlights: ['Vue partagée native sans extensions', 'Ratio de division ajustable', 'Fonctionne avec n\'importe quel site', 'Support des raccourcis clavier'] },
    ],
  },
  comparison: {
    badge: 'Pourquoi Nova?', title: 'Voyez la comparaison', sub: 'Nova n\'est pas juste un autre navigateur. Il est doté de fonctionnalités que d\'autres facturent ou ne proposent pas du tout.',
    recommended: '✦ Recommandé',
    disclaimer: 'Basé sur les configurations par défaut en 2025. Certaines fonctionnalités peuvent nécessiter des extensions dans d\'autres navigateurs.',
    features: ['Bloqueur de pub intégré', 'IA intégrée', 'Écran partagé', 'Espaces de travail', 'Télémétrie zéro', 'Open Source', 'Mode privé', 'Mode lecture', 'Sans compte', 'Gratuit pour toujours'],
  },
  community: {
    badge: 'Communauté', title: 'Construit ouvertement, ensemble', sub: 'Nova est un projet communautaire. Chaque fonctionnalité et correction se passe publiquement sur GitHub.',
    starTitle: 'Étoile sur GitHub', starDesc: 'Si Nova vous est utile, une étoile aide les autres à le découvrir.', starCta: 'Étoiler le dépôt',
    discussTitle: 'Rejoindre la discussion', discussDesc: 'Partagez des retours, demandez des fonctionnalités, signalez des bugs ou dites juste bonjour.', discussCta: 'Ouvrir une discussion',
    issueTitle: 'Partagez vos retours', issueDesc: 'Vous avez essayé Nova? Nous voulons entendre ce que vous en pensez.', issueCta: 'Ouvrir un issue',
    footer: 'Tout le développement se passe publiquement sur',
  },
  trust: {
    badge: 'Ouvert & Honnête', title: 'Vous pouvez nous faire confiance — et vérifier', sub: 'Car la confiance sans transparence n\'est qu\'une affirmation marketing.',
    openSource: '100% Open Source', openSourceDesc: 'Licence MIT — lisez chaque ligne sur GitHub',
    noTelemetry: 'Télémétrie zéro', noTelemetryDesc: 'Pas d\'analytique, pas de rapports de crash, rien',
    noAccount: 'Pas de compte nécessaire', noAccountDesc: 'Téléchargez et lancez. Jamais d\'inscription.',
    community: 'Construit par la communauté', communityDesc: 'Façonné par les utilisateurs, pour les utilisateurs',
    changelogBadge: 'Journal des modifications', changelogTitle: 'Toujours en amélioration', changelogSub: 'Nous livrons vite et souvent. Voici ce qui arrive.',
    viewAll: 'Voir l\'historique complet des versions sur GitHub →', latest: 'Dernier', stable: 'Stable', launch: 'Lancement',
  },
  faq: {
    badge: 'FAQ', title: 'Questions fréquemment posées', sub: 'Tout ce que vous devez savoir avant de changer. Pas de réponse? Demandez-nous sur',
    askLink: 'GitHub Discussions',
    items: [
      { q: 'Nova Browser est-il vraiment gratuit?', a: "Oui, complètement. Nova est open source sous la licence MIT. Pas de niveaux premium, d'abonnements ou de coûts cachés." },
      { q: 'Est-il basé sur Chromium?', a: "Nova est construit sur Electron, qui utilise Chromium. Contrairement à Chrome, nous supprimons tous les traqueurs et la télémétrie Google." },
      { q: 'Nova collecte-t-il des données sur moi?', a: "Absolument pas. Nova a une télémétrie zéro. Nous ne collectons pas de rapports de crash, d'analyses d'utilisation ou de données personnelles." },
      { q: "Comment fonctionne l'IA intégrée?", a: "L'IA de Nova fonctionne entièrement localement sur votre appareil via WebGPU. Elle télécharge le modèle une fois puis fonctionne complètement hors ligne." },
      { q: 'Puis-je importer des favoris depuis Chrome ou Firefox?', a: 'Oui! Nova supporte l\'importation de favoris depuis tout navigateur pouvant exporter un fichier HTML de favoris standard.' },
      { q: 'Nova supporte-t-il les extensions Chrome?', a: 'Nova a un support de base des extensions. Étant construit sur Electron/Chromium, de nombreuses extensions Chrome peuvent être chargées manuellement.' },
      { q: 'Quelles plateformes Nova supporte-t-il?', a: 'Actuellement macOS (Apple Silicon & Intel) et Windows. Le support Linux est prévu pour une future version.' },
      { q: 'Comment puis-je contribuer ou signaler un bug?', a: 'Rendez-vous sur notre dépôt GitHub. Nous accueillons les pull requests, rapports de bugs et suggestions de fonctionnalités.' },
    ],
  },
  cta: {
    title: 'Prêt à reprendre le contrôle de votre navigateur?',
    sub: 'Rejoignez des milliers d\'utilisateurs qui ont adopté Nova pour une expérience web plus rapide, plus propre et plus privée. Entièrement open source et gratuit pour toujours.',
    downloadMac: 'Télécharger pour Mac', downloadWin: 'Télécharger pour Windows', github: 'Étoile sur GitHub',
  },
  footer: { privacy: 'Politique de confidentialité', terms: 'Conditions d\'utilisation', contact: 'Contact', copy: 'Nova Browser. Open Source.' },
};

// ─── SPANISH ────────────────────────────────────────────────────────────────
const es: Translation = {
  lang: 'es', langName: 'Español', flag: '🇪🇸',
  nav: { features: 'Características', privacy: 'Privacidad', design: 'Diseño', github: 'GitHub', download: 'Descargar', community: 'Comunidad' },
  hero: {
    badge: 'Nova Browser 1.0 ya está disponible',
    headline1: 'Internet,',
    headline2: 'reimaginado para ti.',
    sub: 'Un navegador orientado a la productividad con IA integrada, bloqueador de anuncios nativo y pantalla dividida. Rápido, hermoso y completamente de código abierto.',
    downloadMac: 'Descargar para Mac',
    downloadWin: 'Descargar para Windows',
    viewSource: 'Ver código fuente',
  },
  stats: {
    title: 'Números reales, sin marketing vacío',
    subtitle: 'Las estadísticas de GitHub se obtienen directamente de la API en tiempo real.',
    stars: 'Estrellas GitHub', forks: 'Forks', license: 'Licencia MIT', openSource: 'Código Abierto',
    liveNote: 'Las estadísticas de GitHub se actualizan en tiempo real.', viewGithub: 'Ver en GitHub →',
  },
  features: {
    badge: 'Características',
    title1: 'Todo lo que necesitas.',
    title2: 'Nada que no necesites.',
    sub: 'Nova está construido desde cero para la productividad y la privacidad.',
    items: {
      tabFolders: { title: 'Carpetas de pestañas', desc: 'Organiza tu vida digital con carpetas de pestañas arrastrables. Separa trabajo, investigación y navegación personal.' },
      splitScreen: { title: 'Pantalla dividida', desc: 'Ve dos pestañas en paralelo. Perfecto para investigación, programación o comparación de documentos.' },
      adBlocker: { title: 'Bloqueador de anuncios integrado', desc: 'Nova bloquea rastreadores y anuncios intrusivos a nivel de red por defecto.' },
      fast: { title: 'Velocidad de rayo', desc: 'Construido sobre Electron y optimizado para el rendimiento. Mínima huella de memoria.' },
      privacy: { title: 'Privacidad primero', desc: 'Tus datos se quedan contigo. Sin telemetría, sin rastreo. Ni siquiera sabemos lo que navegas.' },
      workspaces: { title: 'Espacios de trabajo', desc: 'Cambia entre contextos completos al instante. Un clic cambia tus pestañas, marcadores e historial.' },
    },
  },
  showcase: {
    badge: 'En profundidad', title: 'Construido diferente,', titleAccent: 'a propósito',
    sub: 'Cada característica de Nova está diseñada para quitarse del camino y dejarte centrarte en lo que importa.',
    items: [
      { badge: 'Asistente IA', title: 'Un navegador que realmente piensa por ti', desc: 'Pregunta a tu navegador cualquier cosa. El agente IA integrado de Nova puede navegar páginas, rellenar formularios, resumir artículos — todo localmente en tu dispositivo.', highlights: ['Funciona 100% localmente via WebGPU (sin clave API)', 'Puede hacer clic, desplazarse e interactuar con cualquier página', 'Memoria persistente entre sesiones', 'Lee páginas en voz alta (texto a voz)'] },
      { badge: 'Escudo de privacidad', title: 'Privado por defecto, no por opción', desc: 'Nova bloquea anuncios, rastreadores y scripts maliciosos a nivel de red antes de que se carguen.', highlights: ['Bloquea 95%+ de redes publicitarias conocidas', 'Protección contra fingerprinting integrada', 'Control de lista blanca por sitio', 'Telemetría cero — no vemos nada'] },
      { badge: 'Espacios de trabajo', title: 'Todo tu contexto, a un clic', desc: 'Cambia instantáneamente entre trabajo, personal e investigación. Cada espacio tiene sus propias pestañas, marcadores e historial.', highlights: ['Etiquetas de espacio de trabajo con código de color', 'Sesiones de pestañas independientes', 'Organización por arrastrar y soltar', 'Sin sincronización — todo se queda local'] },
      { badge: 'Pantalla dividida', title: 'Dos páginas, cero ventanas', desc: 'Ve cualquier dos pestañas en paralelo en una sola ventana. Investiga mientras escribes.', highlights: ['Vista dividida nativa sin extensiones', 'Ratio de división ajustable', 'Funciona con cualquier sitio web', 'Soporte de atajos de teclado'] },
    ],
  },
  comparison: {
    badge: '¿Por qué Nova?', title: 'Mira cómo nos comparamos', sub: 'Nova no es solo otro navegador. Está construido con características que otros cobran o no ofrecen en absoluto.',
    recommended: '✦ Recomendado',
    disclaimer: 'Basado en configuraciones por defecto de 2025. Algunas características pueden requerir extensiones en otros navegadores.',
    features: ['Bloqueador de anuncios integrado', 'IA integrada', 'Pantalla dividida', 'Espacios de trabajo', 'Telemetría cero', 'Código abierto', 'Modo privado', 'Modo lectura', 'Sin cuenta requerida', 'Gratis para siempre'],
  },
  community: {
    badge: 'Comunidad', title: 'Construido abiertamente, juntos', sub: 'Nova es un proyecto impulsado por la comunidad. Cada característica y corrección ocurre públicamente en GitHub.',
    starTitle: 'Estrella en GitHub', starDesc: 'Si encuentras Nova útil, una estrella ayuda a otros a descubrirlo.', starCta: 'Dar estrella al repo',
    discussTitle: 'Únete a la discusión', discussDesc: 'Comparte comentarios, solicita características, reporta errores o simplemente saluda.', discussCta: 'Abrir una discusión',
    issueTitle: 'Comparte tu opinión', issueDesc: '¿Probaste Nova? Nos encantaría saber qué piensas.', issueCta: 'Abrir un issue',
    footer: 'Todo el desarrollo ocurre públicamente en',
  },
  trust: {
    badge: 'Abierto y Honesto', title: 'Puedes confiar en nosotros — y verificarlo', sub: 'Porque la confianza sin transparencia es solo una afirmación de marketing.',
    openSource: '100% Código Abierto', openSourceDesc: 'Licencia MIT — lee cada línea en GitHub',
    noTelemetry: 'Telemetría Cero', noTelemetryDesc: 'Sin análisis, sin informes de errores, nada',
    noAccount: 'Sin cuenta necesaria', noAccountDesc: 'Descarga y ejecuta. Nunca te registres.',
    community: 'Construido por la comunidad', communityDesc: 'Moldeado por usuarios, para usuarios',
    changelogBadge: 'Registro de cambios', changelogTitle: 'Siempre mejorando', changelogSub: 'Lanzamos rápido y seguido. Aquí está lo que ha llegado.',
    viewAll: 'Ver historial completo de versiones en GitHub →', latest: 'Último', stable: 'Estable', launch: 'Lanzamiento',
  },
  faq: {
    badge: 'FAQ', title: 'Preguntas frecuentes', sub: 'Todo lo que necesitas saber antes de cambiar. ¿No encuentras la respuesta? Pregúntanos en',
    askLink: 'GitHub Discussions',
    items: [
      { q: '¿Nova Browser es realmente gratuito?', a: 'Sí, completamente. Nova es de código abierto bajo la licencia MIT. No hay niveles premium, suscripciones ni costos ocultos.' },
      { q: '¿Está basado en Chromium?', a: 'Nova está construido sobre Electron, que usa Chromium. A diferencia de Chrome, eliminamos todo el rastreo y la telemetría de Google.' },
      { q: '¿Nova recopila datos sobre mí?', a: 'Absolutamente no. Nova tiene telemetría cero. No recopilamos informes de errores, análisis de uso ni datos personales.' },
      { q: '¿Cómo funciona la IA integrada?', a: 'La IA de Nova funciona completamente de forma local en tu dispositivo usando WebGPU. Descarga el modelo una vez y luego funciona completamente sin conexión.' },
      { q: '¿Puedo importar marcadores de Chrome o Firefox?', a: 'Sí. Nova soporta la importación de marcadores de cualquier navegador que pueda exportar un archivo HTML de marcadores estándar.' },
      { q: '¿Nova soporta extensiones de Chrome?', a: 'Nova tiene soporte básico de extensiones. Dado que está construido sobre Electron/Chromium, muchas extensiones de Chrome pueden cargarse manualmente.' },
      { q: '¿Qué plataformas soporta Nova?', a: 'Actualmente macOS (Apple Silicon e Intel) y Windows. El soporte de Linux está planeado para una versión futura.' },
      { q: '¿Cómo puedo contribuir o reportar un error?', a: 'Ve a nuestro repositorio de GitHub. Damos la bienvenida a pull requests, informes de errores y sugerencias de características.' },
    ],
  },
  cta: {
    title: '¿Listo para recuperar el control de tu navegador?',
    sub: 'Únete a miles de usuarios que han cambiado a Nova para una experiencia web más rápida, limpia y privada. Completamente de código abierto y gratuito para siempre.',
    downloadMac: 'Descargar para Mac', downloadWin: 'Descargar para Windows', github: 'Estrella en GitHub',
  },
  footer: { privacy: 'Política de privacidad', terms: 'Términos de servicio', contact: 'Contacto', copy: 'Nova Browser. Código Abierto.' },
};

export const translations: Record<Language, Translation> = { en, tr, ru, de, fr, es };
export const languageList: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

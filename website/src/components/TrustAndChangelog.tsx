import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Code, Heart, Lock } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

export const TrustAndChangelog = () => {
  const { t, lang } = useLang();

  const badges = useMemo(() => [
    {
      icon: <Code className="w-6 h-6 text-blue-500" />,
      title: t.trust.openSource,
      desc: t.trust.openSourceDesc,
      color: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20',
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-500" />,
      title: t.trust.noTelemetry,
      desc: t.trust.noTelemetryDesc,
      color: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-500/20',
    },
    {
      icon: <Lock className="w-6 h-6 text-purple-500" />,
      title: t.trust.noAccount,
      desc: t.trust.noAccountDesc,
      color: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-500/20',
    },
    {
      icon: <Heart className="w-6 h-6 text-rose-500" />,
      title: t.trust.community,
      desc: t.trust.communityDesc,
      color: 'from-rose-500/10 to-rose-500/5',
      border: 'border-rose-500/20',
    },
  ], [t.trust]);

  const changelog = useMemo(() => [
    {
      version: 'v1.2.0',
      date: lang === 'tr' ? 'Temmuz 2025' : lang === 'ru' ? 'Июль 2025' : lang === 'de' ? 'Juli 2025' : lang === 'fr' ? 'Juillet 2025' : lang === 'es' ? 'Julio 2025' : 'July 2025',
      tag: t.trust.latest,
      tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      items: lang === 'tr' ? [
        'Ok tuşlarıyla yatay sekme kaydırma özelliği eklendi',
        'Yapay zeka ajanı: çökmeleri önlemek için kayan pencere hafızası',
        'Koyu cam arayüzü ile gizli sekme tasarımı yenilendi',
        'Tüm bileşenlerde animasyonlar cilalandı',
      ] : lang === 'ru' ? [
        'Добавлена горизонтальная прокрутка вкладок стрелками',
        'ИИ-агент: скользящее окно памяти для предотвращения сбоев',
        'Редизайн приватных вкладок с темным стеклянным интерфейсом',
        'Улучшена анимация всех компонентов',
      ] : lang === 'de' ? [
        'Horizontales Tab-Scrollen mit Pfeiltasten hinzugefügt',
        'KI-Agent: Sliding-Window-Speicher zur Vermeidung von Abstürzen',
        'Neugestaltung privater Tabs mit dunkler Glas-UI',
        'Animationen in allen Komponenten verfeinert',
      ] : lang === 'fr' ? [
        'Ajout du défilement horizontal des onglets avec flèches',
        'Agent IA : mémoire à fenêtre glissante pour éviter les plantages',
        'Refonte des onglets privés avec interface en verre sombre',
        'Animations peaufinées sur tous les composants',
      ] : lang === 'es' ? [
        'Añadido desplazamiento horizontal de pestañas con flechas',
        'Agente IA: memoria de ventana deslizante para evitar caídas',
        'Rediseño de pestañas privadas con interfaz de vidrio oscuro',
        'Animaciones pulidas en todos los componentes',
      ] : [
        'Added horizontal tab scrolling with arrow controls',
        'AI agent: sliding window memory to prevent crashes',
        'Private tab redesign with dark glass UI',
        'Animation polish across all components',
      ]
    },
    {
      version: 'v1.1.0',
      date: lang === 'tr' ? 'Haziran 2025' : lang === 'ru' ? 'İюнь 2025' : lang === 'de' ? 'Juni 2025' : lang === 'fr' ? 'Juin 2025' : lang === 'es' ? 'Junio 2025' : 'June 2025',
      tag: t.trust.stable,
      tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      items: lang === 'tr' ? [
        'WebGPU tabanlı yerleşik yapay zeka asistanı',
        'Sekmeler için bölünmüş ekran görünümü',
        'Renkli etiketlere sahip çalışma alanları',
        'Seslendirme (TTS) özellikli okuyucu modu',
      ] : lang === 'ru' ? [
        'Встроенный ИИ-ассистент на базе WebGPU',
        'Разделенный экран для любых вкладок',
        'Рабочие пространства с цветными метками',
        'Режим чтения с поддержкой TTS',
      ] : lang === 'de' ? [
        'Integrierter KI-Assistent powered by WebGPU',
        'Geteilter Bildschirm für beliebige Tabs',
        'Tab-Arbeitsbereiche mit Farblabels',
        'Lesemodus mit TTS-Unterstützung',
      ] : lang === 'fr' ? [
        'Assistant IA intégré propulsé par WebGPU',
        'Écran partagé pour deux onglets',
        'Espaces de travail avec étiquettes de couleur',
        'Mode lecture avec support TTS',
      ] : lang === 'es' ? [
        'Asistente de IA integrado alimentado por WebGPU',
        'Vista de pantalla dividida para cualquier pestaña',
        'Espacios de trabajo con etiquetas de color',
        'Modo lectura con soporte TTS',
      ] : [
        'Built-in AI assistant powered by WebGPU',
        'Split screen view for any two tabs',
        'Tab workspaces with color labels',
        'Reader mode with TTS support',
      ]
    },
    {
      version: 'v1.0.0',
      date: lang === 'tr' ? 'Mayıs 2025' : lang === 'ru' ? 'Май 2025' : lang === 'de' ? 'Mai 2025' : lang === 'fr' ? 'Mai 2025' : lang === 'es' ? 'Mayo 2025' : 'May 2025',
      tag: t.trust.launch,
      tagColor: 'bg-primary/10 text-primary',
      items: lang === 'tr' ? [
        'İlk genel sürüm yayınlandı',
        'Dahili reklam engelleyici entegre edildi',
        'Klasör destekli yer imi yöneticisi',
        'Koyu / Açık / Sistem teması',
      ] : lang === 'ru' ? [
        'Первый публичный релиз',
        'Встроенный блокировщик рекламы',
        'Менеджер закладок с папками',
        'Темная / Светлая / Системная тема',
      ] : lang === 'de' ? [
        'Erste öffentliche Version',
        'Integrierter Werbeblocker',
        'Lesezeichen-Manager mit Ordnern',
        'Dunkles / Helles / System-Theme',
      ] : lang === 'fr' ? [
        'Première version publique',
        'Bloqueur de publicités natif intégré',
        'Gestionnaire de favoris avec dossiers',
        'Thème Sombre / Clair / Système',
      ] : lang === 'es' ? [
        'Primer lanzamiento público',
        'Bloqueador de anuncios nativo integrado',
        'Gestor de marcadores con carpetas',
        'Tema Oscuro / Claro / Sistema',
      ] : [
        'Initial public release',
        'Native ad blocker built-in',
        'Bookmark manager with folders',
        'Dark / Light / System theme',
      ]
    },
  ], [lang, t.trust]);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">{t.trust.badge}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-2">
            {t.trust.title}
          </h2>
          <p className="text-foreground/60">{t.trust.sub}</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
          {badges.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl bg-gradient-to-br ${b.color} border ${b.border} p-6 flex flex-col items-center text-center gap-3`}
            >
              <div className="p-3 rounded-xl bg-white/60 dark:bg-foreground/10 shadow-sm">
                {b.icon}
              </div>
              <div className="font-bold text-foreground text-sm">{b.title}</div>
              <div className="text-foreground/60 text-xs leading-relaxed">{b.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Changelog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">{t.trust.changelogBadge}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-2">
            {t.trust.changelogTitle}
          </h2>
          <p className="text-foreground/60">{t.trust.changelogSub}</p>
        </motion.div>

        <div className="max-w-2xl mx-auto relative">
          {/* Timeline line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-px bg-border/60 hidden sm:block" />

          <div className="flex flex-col gap-8">
            {changelog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="sm:pl-14 relative"
              >
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-[46px] h-[46px] rounded-full bg-background border-2 border-primary shadow-sm flex items-center justify-center text-[10px] font-bold text-primary hidden sm:flex">
                  {entry.version.replace('v', '')}
                </div>

                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="font-bold text-foreground">{entry.version}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${entry.tagColor}`}>
                      {entry.tag}
                    </span>
                    <span className="text-xs text-foreground/40 ml-auto">{entry.date}</span>
                  </div>
                  <ul className="space-y-2">
                    {entry.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground/70">
                        <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline font-medium"
            >
              {t.trust.viewAll}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

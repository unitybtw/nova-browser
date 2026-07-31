import { motion } from 'framer-motion';
import { Code2, MessageCircle, Star } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

export const Testimonials = () => {
  const { t } = useLang();

  const communityLinks = [
    {
      icon: <Code2 className="w-7 h-7" />,
      title: t.community.starTitle,
      desc: t.community.starDesc,
      cta: t.community.starCta,
      href: 'https://github.com/unitybtw/nova-browser',
      color: 'from-slate-500/10 to-slate-500/5',
      border: 'border-slate-400/20',
      accent: 'text-slate-600 dark:text-slate-300',
    },
    {
      icon: <MessageCircle className="w-7 h-7" />,
      title: t.community.discussTitle,
      desc: t.community.discussDesc,
      cta: t.community.discussCta,
      href: 'https://github.com/unitybtw/nova-browser/discussions',
      color: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: <Star className="w-7 h-7" />,
      title: t.community.issueTitle,
      desc: t.community.issueDesc,
      cta: t.community.issueCta,
      href: 'https://github.com/unitybtw/nova-browser/issues',
      color: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-500/20',
      accent: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <section id="community" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">{t.community.badge}</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            {t.community.title}
          </h2>
          <p className="text-lg text-foreground/70">
            {t.community.sub}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {communityLinks.map((item, i) => (
            <motion.a
              key={i}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`rounded-3xl bg-gradient-to-br ${item.color} border ${item.border} p-8 flex flex-col gap-4 hover:scale-[1.03] transition-transform duration-300 cursor-pointer group`}
            >
              <div className={`p-3 rounded-2xl bg-white/60 dark:bg-foreground/10 shadow-sm self-start ${item.accent}`}>
                {item.icon}
              </div>
              <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed flex-1">{item.desc}</p>
              <span className={`text-sm font-semibold ${item.accent} group-hover:underline`}>
                {item.cta} →
              </span>
            </motion.a>
          ))}
        </div>

        {/* GitHub embed note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 text-sm text-foreground/50"
        >
          {t.community.footer}{' '}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            github.com/unitybtw/nova-browser
          </a>
        </motion.div>
      </div>
    </section>
  );
};

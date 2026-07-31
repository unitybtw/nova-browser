import { motion } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, Zap, EyeOff, LayoutPanelLeft, FolderTree } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

export const Features = () => {
  const { t } = useLang();

  const features = [
    {
      icon: <FolderTree className="w-6 h-6 text-primary" />,
      title: t.features.items.tabFolders.title,
      description: t.features.items.tabFolders.desc
    },
    {
      icon: <LayoutPanelLeft className="w-6 h-6 text-accent" />,
      title: t.features.items.splitScreen.title,
      description: t.features.items.splitScreen.desc
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-secondary" />,
      title: t.features.items.adBlocker.title,
      description: t.features.items.adBlocker.desc
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: t.features.items.fast.title,
      description: t.features.items.fast.desc
    },
    {
      icon: <EyeOff className="w-6 h-6 text-purple-500" />,
      title: t.features.items.privacy.title,
      description: t.features.items.privacy.desc
    },
    {
      icon: <LayoutDashboard className="w-6 h-6 text-blue-500" />,
      title: t.features.items.workspaces.title,
      description: t.features.items.workspaces.desc
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-primary uppercase tracking-widest mb-3"
          >
            {t.features.badge}
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-foreground mb-6"
          >
            {t.features.title1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t.features.title2}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-foreground/70"
          >
            {t.features.sub}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass p-8 rounded-3xl hover:bg-white/60 dark:hover:bg-foreground/10 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-foreground/10 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { Puzzle, FolderTree, SplitSquareVertical, Volume2, Sparkles } from 'lucide-react';

export const FeaturesBento: React.FC = () => {
  const items = [
    {
      span: 'lg:col-span-8',
      icon: <Puzzle className="w-6 h-6 text-purple-400" />,
      tag: 'Eklenti Ekosistemi',
      title: 'Chrome Web Store Doğrudan Yükleme',
      desc: 'chromewebstore.google.com sayfalarını gezerken tek tıkla doğrudan CRX3 eklentilerini tarayıcınıza yükleyin.',
      badge: 'CRX3 Direct',
    },
    {
      span: 'lg:col-span-4',
      icon: <SplitSquareVertical className="w-6 h-6 text-amber-400" />,
      tag: 'Çoklu Görev',
      title: 'İkili Bölünmüş Ekran (Split View)',
      desc: 'İki web sayfasını yan yana çalıştırın; bağımsız zoom ve kaydırma ile üretkenliği ikiye katlayın.',
      badge: 'Dual Pane',
    },
    {
      span: 'lg:col-span-4',
      icon: <FolderTree className="w-6 h-6 text-cyan-400" />,
      tag: 'Sekme Yönetimi',
      title: 'Sınırsız Çalışma Alanları (Workspaces)',
      desc: 'Kişisel, iş ve araştırma sekmelerinizi izole çalışma alanlarına ve renkli klasörlere ayırın.',
      badge: 'Workspaces',
    },
    {
      span: 'lg:col-span-8',
      icon: <Volume2 className="w-6 h-6 text-emerald-400" />,
      tag: 'Okuma Stüdyosu',
      title: 'Dikkatsiz Okuyucu Modu & İşletim Sistemi Ses Sentezi',
      desc: 'Mozilla Readability ile temizlenmiş metinleri yerel işletim sistemi yapay zeka sesiyle dinleyin.',
      badge: 'Native TTS',
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-[#050608]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full card-glass text-xs font-mono text-cyan-400 mb-4 border border-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>GELİŞMİŞ ÖZELLİKLER</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Üretkenliğinizi <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400">
              Maksimuma Çıkarın
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed"
          >
            Günlük web deneyiminizi hızlandıran ve kolaylaştıran modern araçlar.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className={`${item.span} card-glass rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {item.badge}
                  </span>
                </div>

                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2 font-mono">
                  {item.tag}
                </span>

                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

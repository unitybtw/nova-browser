import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, EyeOff, ServerOff } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      title: 'Sıfır-Bilgi Cihaz Eşleme',
      desc: 'Parola ve e-posta olmadan çalışan 1-Tık Eşleme kodunuz, cihazınızda AES-256-GCM ile şifrelenen anahtarın kendisidir.',
      badge: 'E2EE AES-256',
    },
    {
      icon: <EyeOff className="w-6 h-6 text-cyan-400" />,
      title: '0 Telemetri & Sıfır İzleme',
      desc: 'Gezindiğiniz sayfalar, aramalarınız veya sekme başlıklarınız asla hiçbir sunucuya gönderilmez ve kaydedilmez.',
      badge: '0 Veri Toplama',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: 'Donanım Destekli Reklam Kalkanı',
      desc: 'Zararlı scriptleri, parmak izi (fingerprinting) izleyicilerini ve crypto madencilerini ağ seviyesinde engeller.',
      badge: 'AdBlock Shield',
    },
    {
      icon: <ServerOff className="w-6 h-6 text-purple-400" />,
      title: 'Tamamen Açık Kaynak',
      desc: 'Tüm Electron ve React kod tabanı GitHub üzerinde kamuya açıktır. Güvenlik açıkları şeffaf şekilde denetlenir.',
      badge: 'MIT Lisansı',
    },
  ];

  return (
    <section id="security" className="py-24 relative overflow-hidden bg-[#07090e]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full card-glass text-xs font-mono text-emerald-400 mb-4 border border-emerald-500/20"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GİZLİLİK VE ŞİFRELEME MİMARİSİ</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Verileriniz Sadece <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-cyan-400">
              Cihazınızda Kalır
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed"
          >
            Gizliliğin bir seçenek değil, tarayıcının temel hakkı olduğuna inanıyoruz.
          </motion.p>
        </div>

        {/* 4 Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {securityPillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="card-glass rounded-3xl p-7 relative hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {pillar.icon}
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {pillar.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

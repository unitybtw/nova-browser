import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, BatteryCharging, Gauge } from 'lucide-react';

export const PerformanceSection: React.FC = () => {
  const benchmarks = [
    {
      metric: 'Bellek Kullanımı (20 Sekme)',
      nova: '310 MB',
      novaPercent: 25,
      chrome: '1,180 MB',
      chromePercent: 95,
      arc: '1,450 MB',
      arcPercent: 100,
      brave: '620 MB',
      bravePercent: 50,
      note: 'Rust tab suspension ve hafif WebGPU motoru sayesinde %70 daha az RAM.',
    },
    {
      metric: 'İlk Sayfa Yükleme Hızı',
      nova: '0.42 sn',
      novaPercent: 20,
      chrome: '0.88 sn',
      chromePercent: 70,
      arc: '1.15 sn',
      arcPercent: 95,
      brave: '0.65 sn',
      bravePercent: 55,
      note: 'Dahili native Cliqz/AdBlocker filtre motoru ile gecikmesiz ağ istekleri.',
    },
  ];

  return (
    <section id="performance" className="py-24 relative overflow-hidden bg-[#050608]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full card-glass text-xs font-mono text-purple-400 mb-4 border border-purple-500/20"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>BENCHMARK VE VERİMLİLİK</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Hafif, Sessiz ve <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-cyan-400">
              Yıldırım Hızında
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed"
          >
            Gereksiz arka plan servisleri ve izleyiciler olmadan çalışan Nova, bilgisayarınızın kaynaklarını tüketmez.
          </motion.p>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <div className="card-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">-%70</span>
              <p className="text-xs text-slate-400">Daha Az RAM Tüketimi</p>
            </div>
          </div>

          <div className="card-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">2.4x</span>
              <p className="text-xs text-slate-400">Daha Hızlı DOM Yüklemesi</p>
            </div>
          </div>

          <div className="card-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">+3.5 Saat</span>
              <p className="text-xs text-slate-400">Daha Fazla Pil Ömrü</p>
            </div>
          </div>
        </div>

        {/* Visual Benchmark Comparison Bars */}
        <div className="max-w-4xl mx-auto card-glass rounded-3xl p-6 sm:p-8 border border-white/10">
          <h3 className="text-base font-bold text-white mb-6">Tarayıcı Karşılaştırma Grafikleri</h3>

          <div className="space-y-8">
            {benchmarks.map((b, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>{b.metric}</span>
                  <span className="text-[11px] font-mono text-slate-500">{b.note}</span>
                </div>

                {/* Nova Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> Nova Browser
                    </span>
                    <span className="font-bold text-cyan-400">{b.nova}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary transition-all duration-1000" style={{ width: `${b.novaPercent}%` }} />
                  </div>
                </div>

                {/* Competitor Bars */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Brave</span>
                      <span>{b.brave}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500/50" style={{ width: `${b.bravePercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Chrome</span>
                      <span>{b.chrome}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/40" style={{ width: `${b.chromePercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Arc</span>
                      <span>{b.arc}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/40" style={{ width: `${b.arcPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

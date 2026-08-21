import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Cpu, MousePointer, Sparkles, Code2 } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

export const AutonomousAgentSection: React.FC = () => {
  const { lang } = useLang();
  const isTr = lang === 'tr';

  const steps = [
    {
      num: '01',
      title: isTr ? 'Doğal Dil Komutu' : 'Natural Language Prompt',
      desc: isTr 
        ? '"GitHub depomdaki son PR\'ları incele ve özet çıkar" gibi herhangi bir komut verin.' 
        : 'Give any web instruction: "Analyze the open PRs on GitHub and summarize changes."',
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />
    },
    {
      num: '02',
      title: isTr ? 'Canlı DOM & Sayfa Analizi' : 'Realtime DOM Tree Inspection',
      desc: isTr 
        ? 'Nova, web sayfasının erişilebilirlik ağacını ve interaktif butonlarını haritalandırır.' 
        : 'Nova maps interactive DOM nodes, buttons, forms, and accessibility trees.',
      icon: <Code2 className="w-5 h-5 text-purple-400" />
    },
    {
      num: '03',
      title: isTr ? 'Görsel İmleç & Otonom Tıklama' : 'Visual Glowing Cursor Navigation',
      desc: isTr 
        ? 'Ekranda parlayan yapay zeka imleci butonlara tıklar, formları doldurur ve sayfaları kaydırır.' 
        : 'The virtual cursor physically clicks, scrolls, types, and navigates autonomously.',
      icon: <MousePointer className="w-5 h-5 text-emerald-400" />
    },
    {
      num: '04',
      title: isTr ? 'Sıfır Bulut Bağımlılığı' : 'Zero Cloud Dependency',
      desc: isTr 
        ? 'Web-LLM ile tamamen cihazınızda yerel çalışır veya kendi API anahtarınızı bağlayabilirsiniz.' 
        : 'Runs locally on WebGPU via Web-LLM or connects to Claude/OpenAI with your own key.',
      icon: <Cpu className="w-5 h-5 text-amber-400" />
    },
  ];

  return (
    <section id="ai-agent" className="py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full linear-card text-xs font-mono text-cyan-400 mb-4 border border-cyan-500/20"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>MODEL CONTEXT PROTOCOL (MCP)</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            {isTr ? 'Web\'de Sizin İçin Gezinen' : 'An Autonomous Agent'} <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary to-purple-400">
              {isTr ? 'Otonom AI Ajanı' : 'That Actually Navigates the Web'}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-foreground/70 leading-relaxed"
          >
            {isTr 
              ? 'Nova sadece bir tarayıcı değil; ekrandaki butonları tıklayan, verileri toplayan ve çok adımlı araştırmaları tamamlayan yerleşik bir yapay zeka asistanıdır.'
              : 'Nova doesn\'t just summarize text — it clicks buttons, fills inputs, and completes multi-step research autonomously with visual cursor tracking.'
            }
          </motion.p>
        </div>

        {/* 4-Step Process Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-16">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="linear-card rounded-2xl p-6 relative flex flex-col justify-between hover:border-white/20 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground/40">{step.num}</span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-foreground/65 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Agent Terminal Box Demonstration */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto linear-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl font-mono text-xs"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              <span className="text-[11px] text-foreground/50 ml-2 font-mono">nova-agent-runtime.log</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              MCP Server :3020 (ACTIVE)
            </span>
          </div>

          <div className="space-y-3 text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 shrink-0">$</span>
              <span className="text-white font-semibold">nova agent --goal "Research latest LLM benchmark results from arXiv and compile table"</span>
            </div>
            <div className="text-slate-400 pl-4 border-l-2 border-white/10 space-y-1 text-[11px]">
              <p className="text-purple-300">→ [MCP:browser_navigate] Opening https://arxiv.org/list/cs.AI/recent</p>
              <p className="text-cyan-300">→ [MCP:dom_query] Scanning 42 recent paper titles & abstracts</p>
              <p className="text-emerald-300">→ [MCP:cursor_click] Filtered top 5 benchmark papers, extracting evaluation metrics</p>
              <p className="text-amber-300">✓ [SUCCESS] Research compiled into markdown memo in Memory Vault (3.2s)</p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Smartphone, Laptop, RefreshCw, ShieldCheck, Copy, Check } from 'lucide-react';

export const SyncShowcase: React.FC = () => {
  const [syncCode, setSyncCode] = useState('nova-8f2a-99c1-4b72-3310');
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const generateNewCode = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const p1 = Math.random().toString(16).substring(2, 6);
      const p2 = Math.random().toString(16).substring(2, 6);
      const p3 = Math.random().toString(16).substring(2, 6);
      const p4 = Math.random().toString(16).substring(2, 6);
      setSyncCode(`nova-${p1}-${p2}-${p3}-${p4}`);
      setIsSyncing(false);
    }, 600);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(syncCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section id="sync" className="py-24 relative overflow-hidden bg-background">
      {/* Background ambient orbs */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-emerald-500/30 text-emerald-400 text-sm font-semibold mb-4"
          >
            <Lock className="w-4 h-4" />
            <span>Zero-Knowledge Multi-Device Sync</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            Pair Any Device in 1-Click <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              No Email. No Passwords. 100% E2EE.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-foreground/70 leading-relaxed"
          >
            All bookmarks, passwords, workspaces, and open tabs are encrypted on your device with military-grade AES-256-GCM before syncing.
          </motion.p>
        </div>

        {/* Interactive Sync Simulator Card */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Interactive Sync Box (7 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-7 glass rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Nova Sync Chain</h3>
                  <p className="text-xs text-foreground/60 font-mono">End-to-End Encrypted Relay</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Realtime
              </span>
            </div>

            {/* Simulated Code Card */}
            <div className="bg-slate-950/70 rounded-2xl p-5 border border-white/10 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Your 1-Click Pairing Code
              </span>
              <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="font-mono text-sm sm:text-base font-bold text-cyan-300 tracking-wider select-all">
                  {syncCode}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Copy Code"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={generateNewCode}
                    disabled={isSyncing}
                    className="p-2 rounded-lg bg-primary hover:bg-primary/80 text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Regenerate Pairing Code"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-Device Flow Illustration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Laptop className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Device 1 (MacBook)</h4>
                  <p className="text-xs text-foreground/60 mt-1">Generates key & encrypts bookmarks and session tabs locally.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Smartphone className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Device 2 (Desktop / Laptop)</h4>
                  <p className="text-xs text-foreground/60 mt-1">Enters the 16-char code and instantly decrypts and merges tabs.</p>
                </div>
              </div>
            </div>

          </motion.div>

          {/* Right: Security Highlights (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 flex flex-col gap-5"
          >
            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">Zero Server Knowledge</h4>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Your pairing code is the AES-256 decryption key. Even the sync relay server cannot read your saved passwords or browsing history.
              </p>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">Instant Realtime Sync</h4>
              <p className="text-xs text-foreground/70 leading-relaxed">
                When you bookmark a page on one laptop, all connected devices update within 200 milliseconds via secure WebSockets.
              </p>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">No Email / Account Required</h4>
              <p className="text-xs text-foreground/70 leading-relaxed">
                You never need to create an account, log in, or give your email. Pair seamlessly and anonymously.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

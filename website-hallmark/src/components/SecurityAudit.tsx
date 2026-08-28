import React from 'react';
import { Lock, Key, FileCheck } from 'lucide-react';

export const SecurityAudit: React.FC = () => {
  return (
    <section id="security" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">
            CRYPTOGRAPHIC SOVEREIGNTY
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            Security by <span className="text-emerald-400">Architecture</span>.
          </h2>
        </div>
        <p className="font-sans text-sm text-slate-300 max-w-md leading-relaxed">
          Nova treats user data as sovereign territory. Every security control is enforced at the binary and protocol layer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="tech-card rounded-3xl p-6 sm:p-8">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mb-6">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">AES-256-GCM Encryption</h3>
          <p className="font-sans text-sm text-slate-300 leading-relaxed mb-6">
            Passwords, authenticated sessions, and local vector embeddings are encrypted using hardware-derived keys from Apple Keychain / Windows DPAPI / Linux SecretService.
          </p>
          <div className="pt-4 border-t border-[#24293d] font-mono text-[11px] text-emerald-400 font-semibold">
            // Zero-Knowledge Storage
          </div>
        </div>

        <div className="tech-card rounded-3xl p-6 sm:p-8">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mb-6">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">IPC Sender Verification</h3>
          <p className="font-sans text-sm text-slate-300 leading-relaxed mb-6">
            Every Electron IPC channel validates origin signatures and main-frame webContents identity, completely preventing prototype pollution and RCE payload injection.
          </p>
          <div className="pt-4 border-t border-[#24293d] font-mono text-[11px] text-indigo-400 font-semibold">
            // Strict Context Isolation
          </div>
        </div>

        <div className="tech-card rounded-3xl p-6 sm:p-8">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit mb-6">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">Reproducible Open Builds</h3>
          <p className="font-sans text-sm text-slate-300 leading-relaxed mb-6">
            100% of Nova’s source code is publicly audited and licensed under MIT. GitHub release artifacts are cryptographically signed with published SHA-256 checksums.
          </p>
          <div className="pt-4 border-t border-[#24293d] font-mono text-[11px] text-cyan-400 font-semibold">
            // 100% MIT Licensed
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityAudit;

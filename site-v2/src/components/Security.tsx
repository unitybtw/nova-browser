import { Lock, Key, FileCheck } from 'lucide-react';

export const Security = () => {
  return (
    <section id="security" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Security by Architecture
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Nova treats user data as sovereign territory. Every security control is enforced at the binary and protocol layer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="surface-panel p-6 sm:p-7">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mb-5">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">AES-256-GCM Encryption</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Passwords, authenticated sessions, and local vector embeddings are encrypted using hardware-derived keys from Apple Keychain / Windows DPAPI / Linux SecretService.
          </p>
          <div className="pt-3 border-t border-[#252a3f] font-mono text-[11px] text-emerald-400 font-semibold">
            Zero-Knowledge Storage
          </div>
        </div>

        <div className="surface-panel p-6 sm:p-7">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mb-5">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">IPC Sender Verification</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Every Electron IPC channel validates origin signatures and main-frame webContents identity, preventing prototype pollution and RCE payload injection.
          </p>
          <div className="pt-3 border-t border-[#252a3f] font-mono text-[11px] text-indigo-400 font-semibold">
            Strict Context Isolation
          </div>
        </div>

        <div className="surface-panel p-6 sm:p-7">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit mb-5">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Reproducible Open Builds</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            100% of Nova’s source code is publicly audited and licensed under MIT. GitHub release artifacts are cryptographically signed with published SHA-256 checksums.
          </p>
          <div className="pt-3 border-t border-[#252a3f] font-mono text-[11px] text-cyan-400 font-semibold">
            100% MIT Licensed
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;

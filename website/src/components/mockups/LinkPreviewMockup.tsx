import { BrowserWindow } from './BrowserWindow';
import { Sparkles, MousePointer, ExternalLink, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const LinkPreviewMockup = () => {
  return (
    <BrowserWindow 
      url="https://research.nova/quantum-ai"
      tabs={[
        { title: 'Quantum Neural Diffusion', active: true },
        { title: 'ArXiv Preprints', active: false }
      ]}
      isShieldActive={true}
    >
      <div className="w-full h-full relative overflow-hidden bg-[#080c16] p-6 select-none flex flex-col justify-between">
        {/* Article Text Content */}
        <div className="max-w-xl space-y-3.5 opacity-60">
          <h2 className="text-xl font-bold text-white leading-tight">Quantum Transformer Architectures for Real-Time LLM Inference</h2>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span>By Dr. Elena Vance</span>
            <span>•</span>
            <span>Published Oct 2026</span>
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            Recent advancements in local neural engines indicate a 400% performance surge when coupling browser WebGPU contexts with quantized weights. For detailed mathematical formulations, refer to the breakthrough publication on{' '}
            <span className="text-indigo-400 underline underline-offset-4 decoration-indigo-500/60 font-medium bg-indigo-500/10 px-1 py-0.5 rounded cursor-pointer">
              arxiv.org/abs/2405.04434
            </span>{' '}
            which benchmarks sub-millisecond tensor evaluations on client devices.
          </p>
        </div>

        {/* Mouse Pointer Cursor Icon */}
        <div className="absolute top-[135px] left-[320px] z-30 pointer-events-none">
          <MousePointer className="w-4 h-4 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>

        {/* Floating AI Link Preview Glassmorphism Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-[155px] left-[180px] w-[340px] bg-[#0c1224]/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl text-white space-y-3 z-40"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Nova AI Link Preview
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Safe Link</span>
            </div>
          </div>

          {/* AI Extracted Summary */}
          <div className="text-[11px] text-white/80 leading-relaxed space-y-2">
            <p>
              "This paper proposes a zero-copy memory pipeline for WebGPU transformer blocks, reducing device thermals by 35% during continuous generation."
            </p>

            <div className="flex items-center gap-3 text-[10px] text-white/50 pt-1">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-400" /> 3 min read</span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">arXiv CS.AI</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">PDF Available</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1 flex items-center gap-2">
            <button className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md">
              <ExternalLink className="w-3 h-3" />
              <span>Open in Split View</span>
            </button>
          </div>
        </motion.div>
      </div>
    </BrowserWindow>
  );
};

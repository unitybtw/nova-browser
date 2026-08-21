import React from 'react';

const GithubIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#050608] pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 p-1 flex items-center justify-center">
              <img src="/assets/nova-icon.png" alt="Nova Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-bold text-white font-mono">NOVA BROWSER</span>
              <p className="text-xs text-slate-500">Open-Source & AI-Native Desktop Web Browser</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#ai-agent" className="hover:text-white transition-colors">AI Agent</a>
            <a href="#performance" className="hover:text-white transition-colors">Performance</a>
            <a href="#security" className="hover:text-white transition-colors">Privacy</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-500 font-mono">
          <div>Built with precision for the open-source community</div>
          <div>&copy; {new Date().getFullYear()} Nova Browser. MIT License.</div>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { BrowserWindow } from './BrowserWindow';
import { Bot, Sparkles, Send, CheckCircle, Terminal } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const AiMockup: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <BrowserWindow 
      url="https://github.com/unitybtw/nova-browser" 
      tabs={[
        { title: 'Nova Browser - GitHub', active: true },
        { title: 'New Tab', active: false }
      ]}
      isShieldActive={true}
      isAiActive={true}
    >
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden text-xs">
        {/* Left: Web Content View */}
        <div className={`flex-1 p-5 flex flex-col justify-between border-r ${
          isDark ? 'bg-[#090d16] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary text-[11px]">
                N
              </div>
              <span className="font-mono font-bold text-sm">unitybtw / nova-browser</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                Public
              </span>
            </div>

            <p className="text-xs text-foreground/75 leading-relaxed mb-4">
              Next-generation AI-native web browser with built-in MCP agent protocol, zero-knowledge sync, and custom theme engine.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-primary block">Architecture</span>
                <span className="font-bold text-xs">Chromium + Web-LLM</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-mono text-emerald-400 block">Security</span>
                <span className="font-bold text-xs">AES-256 E2EE Sync</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/10 text-[11px] font-mono opacity-70">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>Autonomous agent cursor enabled</span>
          </div>
        </div>

        {/* Right: AI SidePanel Chat */}
        <div className={`w-full md:w-64 p-4 flex flex-col justify-between ${
          isDark ? 'bg-[#060911] text-slate-200' : 'bg-slate-50 text-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs">Nova AI Assistant</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Local LLM
              </span>
            </div>

            {/* User message */}
            <div className={`rounded-xl p-2.5 mb-2.5 text-[11px] border ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="font-semibold text-primary block mb-0.5">You:</span>
              <span>Can you summarize the core highlights?</span>
            </div>

            {/* AI message */}
            <div className="rounded-xl p-2.5 text-[11px] bg-purple-500/10 border border-purple-500/25">
              <span className="font-semibold text-purple-400 flex items-center gap-1 mb-1">
                <Bot className="w-3 h-3" /> Nova AI:
              </span>
              <ul className="space-y-1 text-foreground/80 text-[10px] leading-tight">
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> Autonomous MCP agent
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> Zero-knowledge cloud sync
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> Chrome store parity
                </li>
              </ul>
            </div>
          </div>

          {/* Input Box */}
          <div className={`mt-3 h-8 rounded-xl border flex items-center px-2.5 justify-between ${
            isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono">Ask something...</span>
            <Send className="w-3 h-3 text-primary" />
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};

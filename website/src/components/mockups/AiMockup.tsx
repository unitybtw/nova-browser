import { Sparkles, Brain, Send } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const AiMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'} flex flex-col font-sans select-none`}>
      <div className={`p-3 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
        <div className={`flex items-center gap-2 font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Sparkles className="w-4 h-4" /></div>
          Browser AI
        </div>
        <Brain className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
         <div className="self-end p-2.5 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-[11px] shadow-sm max-w-[85%]">
           Summarize this page
         </div>
         <div className={`self-start p-2.5 rounded-2xl rounded-tl-sm border ${isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-200 bg-white text-slate-800'} text-[11px] shadow-sm max-w-[95%] leading-relaxed`}>
           This page discusses the new features of Nova Browser, including the native AI integration and privacy shield.
         </div>
      </div>
      <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className={`flex items-center px-3 py-2 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <span className="text-[11px] text-slate-400 flex-1">Ask Nova...</span>
          <Send className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </div>
  );
};

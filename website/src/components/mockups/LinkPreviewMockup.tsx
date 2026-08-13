import { Globe, ArrowRight } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const LinkPreviewMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'} flex items-center justify-center font-sans relative`}>
      <div className="absolute top-12 left-12 right-12 space-y-4 opacity-50">
        <div className={`h-2 w-3/4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className={`h-2 w-1/2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className={`h-2 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
      </div>
      
      <div className={`w-56 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/95' : 'border-slate-200 bg-white/95'} shadow-2xl backdrop-blur-md p-3 absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}>
         <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
           <Globe className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
           <span className={`text-[10px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>wikipedia.org/wiki/Nova</span>
         </div>
         <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Nova (astronomy)</h4>
         <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed mb-2`}>
           A nova is a transient astronomical event that causes the sudden appearance of a bright, apparently "new" star...
         </p>
         <div className={`text-[9px] font-bold text-blue-500 flex items-center gap-1`}>Read more <ArrowRight className="w-2.5 h-2.5" /></div>
      </div>
    </div>
  );
};

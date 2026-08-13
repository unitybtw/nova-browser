import { AlignLeft } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const TabsMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'} flex font-sans`}>
      <div className={`w-14 flex flex-col items-center py-4 gap-4 border-r ${isDark ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-slate-100'} h-full`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 shadow-lg shadow-blue-500/20 text-white font-bold text-lg">W</div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-pink-500" />
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} mt-auto`}>
          <AlignLeft className="w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-2">
         <div className={`h-8 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center px-3 gap-2`}>
           <div className={`w-4 h-4 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
           <div className={`h-2 w-24 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
         </div>
         <div className={`h-8 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center px-3 gap-2`}>
           <div className={`w-4 h-4 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
           <div className={`h-2 w-32 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
         </div>
         <div className={`h-8 rounded-lg ${isDark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'} flex items-center px-3 gap-2`}>
           <div className="w-4 h-4 rounded-full bg-blue-500" />
           <div className="h-2 w-20 rounded-full bg-blue-500/50" />
         </div>
      </div>
    </div>
  );
};

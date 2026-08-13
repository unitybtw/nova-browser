import { Columns } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const SplitMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'} flex font-sans p-2 gap-2`}>
      <div className={`flex-1 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} overflow-hidden relative`}>
         <div className={`absolute top-0 left-0 right-0 h-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center px-2 gap-2`}>
           <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
           <div className={`h-1.5 w-16 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
         </div>
         <div className="mt-10 px-4 space-y-2">
           <div className={`h-2 w-3/4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
           <div className={`h-2 w-1/2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
           <div className={`h-2 w-5/6 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
         </div>
      </div>
      <div className="w-[2px] bg-blue-500 rounded-full flex flex-col justify-center items-center relative">
         <div className={`absolute w-5 h-5 rounded-full border-2 border-blue-500 ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-center z-10 shadow-md`}>
           <Columns className="w-2.5 h-2.5 text-blue-500" />
         </div>
      </div>
      <div className={`flex-1 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} overflow-hidden relative`}>
         <div className={`absolute top-0 left-0 right-0 h-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center px-2 gap-2`}>
           <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
           <div className={`h-1.5 w-16 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
         </div>
         <div className="mt-10 px-4 space-y-2">
           <div className={`h-2 w-5/6 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
           <div className={`h-2 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
           <div className={`h-2 w-2/3 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
         </div>
      </div>
    </div>
  );
};

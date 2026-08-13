import { Shield, EyeOff, Lock } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const ShieldMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'} flex items-center justify-center font-sans`}>
       <div className={`w-64 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} shadow-xl p-4 flex flex-col`}>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
               <Shield className="w-5 h-5 text-emerald-500" />
             </div>
             <div>
               <div className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Privacy Shield</div>
               <div className="text-[10px] text-emerald-500 font-medium">Protection Active</div>
             </div>
          </div>
          <div className="space-y-2">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} flex justify-between items-center`}>
              <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}><EyeOff className="w-3.5 h-3.5 text-slate-400" /> Trackers Blocked</div>
              <div className="text-[11px] font-bold text-emerald-500">142</div>
            </div>
            <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} flex justify-between items-center`}>
              <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}><Lock className="w-3.5 h-3.5 text-slate-400" /> Connection</div>
              <div className="text-[11px] font-bold text-emerald-500">Secure</div>
            </div>
          </div>
       </div>
    </div>
  );
};

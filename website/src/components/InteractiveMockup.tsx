import { Search, Sparkles, Shield, Puzzle, Settings, AlignLeft, EyeOff, Send, Brain } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const InteractiveMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const bgGradient = isDark ? 'bg-gradient-to-br from-slate-900 to-black' : 'bg-slate-50';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl border ${borderColor} ${bgGradient} flex flex-col font-sans select-none relative`}>
      {/* TopBar */}
      <div className={`h-14 flex items-center justify-between px-4 border-b ${borderColor} ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md`}>
        {/* Window Controls */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        {/* Omnibox / Search */}
        <div className="flex-1 flex justify-center max-w-2xl mx-4 relative">
          <div className={`w-full h-9 rounded-xl flex items-center px-4 gap-2 ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-100 border-slate-200'} border shadow-inner`}>
            <Search className={`w-4 h-4 ${mutedText}`} />
            <div className={`flex-1 text-sm font-medium ${textColor}`}>nova://settings</div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>⌘ K</div>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1">
          <div className={`p-2 rounded-lg ${isDark ? 'text-purple-400' : 'text-purple-600'}`}><Sparkles className="w-4 h-4" /></div>
          <div className={`p-2 rounded-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}><Shield className="w-4 h-4" /></div>
          <div className={`p-2 rounded-lg ${mutedText}`}><Puzzle className="w-4 h-4" /></div>
          <div className={`p-2 rounded-lg ${mutedText}`}><Settings className="w-4 h-4" /></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex flex-1 overflow-hidden relative`}>
        {/* Left Sidebar (Vertical Tabs) */}
        <div className={`w-14 flex flex-col items-center py-4 gap-4 border-r ${borderColor} ${isDark ? 'bg-[#1e293b]' : 'bg-slate-100'} z-10`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 shadow-lg shadow-blue-500/20 text-white font-bold text-lg`}>
            P
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} transition-colors`}>
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-pink-500" />
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} transition-colors mt-auto`}>
            <AlignLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Center Content (Webview / Tab) */}
        <div className={`flex-1 flex flex-col overflow-hidden rounded-tl-xl ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
          <div className="flex-1 p-8 flex flex-col max-w-3xl mx-auto w-full pt-12 overflow-hidden">
            <h1 className={`text-3xl font-bold mb-8 ${textColor}`}>Settings</h1>
            
            <div className="space-y-6">
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>Search Engine</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-4 rounded-xl border-2 border-blue-500 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                    <div className={`font-medium ${textColor}`}>Google</div>
                    <div className={`text-xs ${mutedText}`}>Fast & Accurate</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`font-medium ${textColor}`}>DuckDuckGo</div>
                    <div className={`text-xs ${mutedText}`}>Privacy focused</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`font-medium ${textColor}`}>Brave Search</div>
                    <div className={`text-xs ${mutedText}`}>Independent index</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>Privacy Shield</h3>
                <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-slate-50'} flex items-center justify-between`}>
                  <div>
                    <div className={`font-medium ${textColor} flex items-center gap-2`}>
                      <EyeOff className="w-4 h-4 text-emerald-500" /> Block Trackers & Ads
                    </div>
                    <div className={`text-xs ${mutedText} mt-1`}>Automatically block intrusive ads and trackers.</div>
                  </div>
                  <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (AI Panel) */}
        <div className={`w-80 flex flex-col border-l ${borderColor} ${isDark ? 'bg-slate-900' : 'bg-white'} z-20`}>
          <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
            <div className={`flex items-center gap-2 font-semibold text-sm ${textColor}`}>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Sparkles className="w-4 h-4" /></div>
              Browser AI
            </div>
            <div className="flex gap-1 text-slate-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4">
             <div className={`self-end max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-[13px] shadow-sm`}>
               How do I change the default search engine?
             </div>
             
             <div className={`self-start max-w-[95%] p-3.5 rounded-2xl rounded-tl-sm border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-white'} text-[13px] ${textColor} shadow-sm leading-relaxed`}>
               You can change the default search engine right here on the settings page. Select Google, DuckDuckGo, or Brave Search from the options on the left.
             </div>
          </div>

          <div className={`p-4 border-t ${borderColor}`}>
            <div className={`flex items-center px-3 py-2.5 rounded-xl border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
              <span className={`text-[13px] ${mutedText} flex-1`}>Ask Nova...</span>
              <div className="p-1.5 rounded-lg text-slate-400"><Send className="w-3.5 h-3.5" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

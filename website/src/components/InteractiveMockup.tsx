import { X, Minus, Square, Search, Sparkles, Shield, Puzzle, Settings, History, Download, AlignLeft, Bot, Mic, Send, Brain, Command, EyeOff } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const InteractiveMockup = () => {
  const { theme } = useTheme();
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [spotlightInput, setSpotlightInput] = useState("");
  const [showSpotlightResults, setShowSpotlightResults] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Animation controllers
  const cursorControls = useAnimation();
  const sidebarControls = useAnimation();
  const splitViewControls = useAnimation();
  const spotlightControls = useAnimation();
  const mainContentControls = useAnimation();

  const isRunningRef = useRef(true);

  useEffect(() => {
    if (theme === 'dark') setIsDark(true);
    else if (theme === 'light') setIsDark(false);
    else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [theme]);

  // Helper for typing effect
  const typeText = async (text: string, setter: (v: string) => void, speed = 30) => {
    setter("");
    for (let i = 0; i <= text.length; i++) {
      if (!isRunningRef.current) break;
      setter(text.slice(0, i));
      await new Promise(r => setTimeout(r, speed + (Math.random() * 20))); // slight randomness
    }
  };

  // Animation Sequence
  useEffect(() => {
    isRunningRef.current = true;
    
    const sequence = async () => {
      if (!isRunningRef.current) return;
      
      // --- RESET STATE ---
      sidebarControls.set({ width: 0, opacity: 0 });
      splitViewControls.set({ width: "0%", opacity: 0, borderLeftWidth: 0 });
      spotlightControls.set({ opacity: 0, scale: 0.9, y: -20 });
      cursorControls.set({ x: 200, y: 300 });
      mainContentControls.set({ scale: 1, borderRadius: 0 });
      
      setSidebarInput("");
      setShowUserBubble(false);
      setIsAiThinking(false);
      setAiResponse("");
      setSpotlightInput("");
      setShowSpotlightResults(false);
      setHoveredButton(null);
      
      // 1. Initial wait
      await new Promise(r => setTimeout(r, 1000));
      if (!isRunningRef.current) return;
      
      // 2. Move cursor to AI Sidebar button
      await cursorControls.start({ x: 700, y: 60, transition: { duration: 1, ease: "easeInOut" } });
      setHoveredButton('ai');
      await new Promise(r => setTimeout(r, 200));
      
      // 3. Click AI button
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      setHoveredButton(null);
      
      // 4. Open sidebar
      sidebarControls.start({ width: 320, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } });
      await new Promise(r => setTimeout(r, 600));
      
      // 5. Move cursor to input field in sidebar
      await cursorControls.start({ x: 650, y: 440, transition: { duration: 0.8, ease: "easeInOut" } });
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      
      // 6. Realistic Typing
      await typeText("Summarize this website", setSidebarInput, 40);
      await new Promise(r => setTimeout(r, 200));
      
      // 7. Click send
      await cursorControls.start({ x: 800, y: 440, transition: { duration: 0.4, ease: "easeInOut" } });
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      
      setSidebarInput("");
      setShowUserBubble(true);
      setIsAiThinking(true);
      await new Promise(r => setTimeout(r, 800));
      
      setIsAiThinking(false);
      const aiFullText = "AuraSite is a modern web design platform focused on futuristic interfaces and pixel-perfect layouts. It provides tools for building next-gen web applications quickly.";
      await typeText(aiFullText, setAiResponse, 15);
      
      await new Promise(r => setTimeout(r, 2500));
      if (!isRunningRef.current) return;
      
      // 8. Close sidebar
      sidebarControls.start({ width: 0, opacity: 0, transition: { duration: 0.4, ease: "circIn" } });
      await new Promise(r => setTimeout(r, 400));
      
      // 9. Move to Split View Button
      await cursorControls.start({ x: 500, y: 60, transition: { duration: 1, ease: "easeInOut" } });
      setHoveredButton('split');
      await new Promise(r => setTimeout(r, 200));
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      setHoveredButton(null);
      
      // 10. Open Split View with cool scale effect on main content
      splitViewControls.start({ width: "50%", opacity: 1, borderLeftWidth: 1, transition: { duration: 0.6, ease: "easeInOut" } });
      await new Promise(r => setTimeout(r, 2500));
      if (!isRunningRef.current) return;
      
      // 11. Close Split View
      splitViewControls.start({ width: "0%", opacity: 0, borderLeftWidth: 0, transition: { duration: 0.5, ease: "easeInOut" } });
      await new Promise(r => setTimeout(r, 600));
      
      // 12. Open Spotlight (Command Palette) via Keyboard Shortcut (Cursor doesn't move to a button)
      await cursorControls.start({ x: 450, y: 350, transition: { duration: 0.8, ease: "easeInOut" } }); // cursor just rests
      spotlightControls.start({ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      await new Promise(r => setTimeout(r, 500));
      
      // 13. Type in Spotlight
      await typeText("How to use split view", setSpotlightInput, 40);
      setShowSpotlightResults(true);
      await new Promise(r => setTimeout(r, 2500));
      
      // 14. Close Spotlight
      spotlightControls.start({ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } });
      
      // Loop
      if (isRunningRef.current) {
        setTimeout(sequence, 2000);
      }
    };
    
    sequence();
    return () => { isRunningRef.current = false; };
  }, [cursorControls, sidebarControls, splitViewControls, spotlightControls, mainContentControls]);

  const frameBg = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const topbarBg = isDark ? 'bg-[#0f172a]' : 'bg-slate-100';
  const toolbarBg = isDark ? 'bg-[#1e293b]' : 'bg-slate-50';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`w-full max-w-4xl mx-auto h-[520px] rounded-2xl ${frameBg} ${borderColor} border shadow-2xl overflow-hidden flex flex-col relative sm:flex font-sans`}>
      {/* Topbar (Tabs & Window Controls) */}
      <div className={`h-11 ${topbarBg} flex items-end px-3 gap-2 border-b ${borderColor} pt-2 relative`}>
        <div className="flex gap-2 mb-3 items-center absolute left-4">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm" />
        </div>
        
        {/* Active Tab */}
        <div className={`px-4 py-2.5 ${toolbarBg} rounded-t-xl flex items-center gap-2 border-t border-x ${borderColor} min-w-[220px] ml-20 shadow-sm z-10 translate-y-[1px]`}>
          <Globe className={`w-3.5 h-3.5 ${mutedText}`} />
          <span className={`text-[13px] font-medium ${textColor}`}>AuraSite - Web Design</span>
          <X className={`w-3.5 h-3.5 ${mutedText} ml-auto hover:text-red-400 cursor-pointer transition-colors`} />
        </div>
        
        <div className={`mb-2.5 p-1.5 rounded-lg hover:bg-slate-800/20 cursor-pointer transition-colors`}>
          <Plus className={`w-4 h-4 ${mutedText}`} />
        </div>
      </div>

      {/* Toolbar (URL bar, extensions) */}
      <div className={`h-[52px] ${toolbarBg} flex items-center px-4 gap-3 border-b ${borderColor} z-10`}>
        <div className="flex gap-0.5">
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>
        </div>
        
        {/* URL Bar */}
        <div className={`flex-1 h-9 ${isDark ? 'bg-[#0f172a]' : 'bg-white'} border ${borderColor} rounded-xl flex items-center px-3 shadow-inner relative group transition-colors`}>
          <Shield className={`w-4 h-4 text-emerald-500 mr-2`} />
          <span className={`text-[13px] ${mutedText}`}>https://</span>
          <span className={`text-[13px] ${textColor}`}>aurasite.tech</span>
          
          <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Star className={`w-4 h-4 ${mutedText}`} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-0.5">
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors`}>
            <Shield className="w-4 h-4" />
          </div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors`}>
            <Download className="w-4 h-4" />
          </div>
          <div className={`p-1.5 rounded-lg transition-colors ${hoveredButton === 'split' ? (isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800') : mutedText}`}>
            <Columns className="w-4 h-4" />
          </div>
          <div className={`p-1.5 rounded-lg transition-colors shadow-sm relative ml-1 ${hoveredButton === 'ai' ? 'bg-purple-500/20 text-purple-600' : 'bg-purple-500/10 text-purple-500'}`}>
            <Sparkles className="w-4 h-4" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full border border-[#1e293b]" />
          </div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 transition-colors ml-1`}>
            <Menu className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex relative overflow-hidden ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
        
        {/* Fake Website Content 1 (Primary) */}
        <motion.div animate={mainContentControls} className="flex-1 flex flex-col items-center justify-center relative min-w-0 bg-white dark:bg-[#0f172a] transform origin-left">
          <div className="text-center max-w-lg px-8">
            <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] mx-auto mb-8 flex items-center justify-center border border-blue-500/20 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Globe className="w-10 h-10 text-blue-500 relative z-10" />
            </div>
            <h1 className={`text-5xl font-bold mb-6 ${textColor} tracking-tight`}>Welcome to AuraSite</h1>
            <p className={`text-xl ${mutedText} mb-10 leading-relaxed`}>Building the future of web design, one perfectly crafted pixel at a time.</p>
            <div className="flex justify-center gap-4">
              <div className="h-12 w-36 bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 rounded-xl cursor-pointer" />
              <div className={`h-12 w-36 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} border ${borderColor} transition-colors rounded-xl cursor-pointer`} />
            </div>
          </div>
        </motion.div>

        {/* Fake Website Content 2 (Split View) */}
        <motion.div 
          initial={{ width: "0%", opacity: 0, borderLeftWidth: 0 }}
          animate={splitViewControls}
          className={`h-full ${borderColor} bg-slate-50 dark:bg-[#1e293b]/50 flex flex-col items-center justify-center overflow-hidden whitespace-nowrap min-w-0 relative shadow-inner`}
        >
          <div className="absolute top-4 left-4 flex gap-2">
             <div className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'} text-[11px] font-bold ${textColor} shadow-sm`}>Documentation</div>
          </div>
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-emerald-500/20 shadow-lg">
            <BookOpen className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${textColor}`}>Getting Started</h2>
          <p className={`text-sm ${mutedText} mb-6`}>Read the quick start guide to build your first site.</p>
          <div className={`h-10 w-32 ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'} shadow-sm rounded-xl`} />
        </motion.div>

        {/* Spotlight Modal (Command Palette) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={spotlightControls}
          className={`absolute top-20 left-1/2 -translate-x-1/2 w-[500px] rounded-2xl ${isDark ? 'bg-[#1e293b]/95 border-slate-700' : 'bg-white/95 border-slate-200'} border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-30 overflow-hidden flex flex-col`}
        >
          <div className={`p-4 border-b ${borderColor} flex items-center gap-3 relative`}>
            <Search className={`w-5 h-5 ${mutedText}`} />
            <div className="flex-1 relative">
               <span className={`text-[15px] ${spotlightInput ? textColor : mutedText} font-medium tracking-wide`}>
                 {spotlightInput || "Search tabs, history, or web..."}
               </span>
               <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-blue-500 animate-pulse ${spotlightInput ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${spotlightInput.length}ch + 2px)` }} />
            </div>
            <div className={`ml-auto flex items-center gap-1.5 ${mutedText} bg-slate-500/10 px-2 py-1 rounded-md`}>
               <Command className="w-3.5 h-3.5" />
               <span className="text-xs font-bold">K</span>
            </div>
          </div>
          
          {showSpotlightResults && (
            <div className="p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
              <div className={`px-4 pt-2 pb-1 text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>Nova AI Suggestions</div>
              <div className={`px-3 py-2.5 rounded-xl bg-purple-500/10 flex items-center gap-3 cursor-pointer`}>
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className={`text-sm font-medium text-purple-600 dark:text-purple-400`}>Ask AI: "{spotlightInput}"</span>
                <span className={`ml-auto text-[10px] font-bold ${mutedText}`}>Enter ↵</span>
              </div>
              
              <div className={`px-4 pt-4 pb-1 text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>Settings & Actions</div>
              <div className={`px-3 py-2.5 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} flex items-center gap-3 transition-colors cursor-pointer group`}>
                <Columns className={`w-4 h-4 ${mutedText} group-hover:text-blue-500`} />
                <span className={`text-sm ${textColor}`}>Toggle <strong className="text-blue-500">Split View</strong> Mode</span>
              </div>
              <div className={`px-3 py-2.5 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} flex items-center gap-3 transition-colors cursor-pointer group`}>
                <Settings className={`w-4 h-4 ${mutedText}`} />
                <span className={`text-sm ${textColor}`}>Split View Settings</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Animated AI Sidebar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={sidebarControls}
          className={`h-full ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-slate-50 border-slate-200'} border-l flex flex-col overflow-hidden shadow-2xl z-20 absolute right-0 top-0 bottom-0`}
        >
          <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between bg-inherit z-10`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className={`text-[13px] font-semibold ${textColor} whitespace-nowrap`}>Nova AI</span>
            </div>
            <X className={`w-4 h-4 ${mutedText} cursor-pointer hover:text-red-400`} />
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            {showUserBubble && (
               <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`self-end max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-[13px] shadow-md`}>
                 Summarize this website
               </motion.div>
            )}
            
            {isAiThinking && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 p-3">
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
               </motion.div>
            )}

            {aiResponse && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className={`self-start max-w-[95%] p-3.5 rounded-2xl rounded-tl-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border text-[13px] ${textColor} leading-relaxed shadow-sm`}
               >
                 {aiResponse}
                 {aiResponse.length < 147 && <span className="inline-block w-1.5 h-3.5 bg-purple-500 ml-1 animate-pulse align-middle" />}
               </motion.div>
            )}
          </div>
          
          <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} bg-inherit`}>
            <div className={`min-h-[44px] rounded-xl ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-300'} border flex items-center px-3 shadow-inner relative group focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all`}>
              <span className={`text-[13px] ${sidebarInput ? textColor : mutedText} flex-1 overflow-hidden whitespace-nowrap`}>
                 {sidebarInput || "Ask Nova..."}
              </span>
              <div className={`p-1.5 rounded-lg ${sidebarInput ? 'bg-purple-600 text-white' : 'text-slate-400'} transition-colors cursor-pointer absolute right-2`}>
                 <Send className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Animated Cursor */}
        <motion.div
          initial={{ x: 200, y: 300 }}
          animate={cursorControls}
          className="absolute z-50 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
        >
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.65376 2.00028L21.4339 16.4815C22.6106 17.5614 21.9056 19.5168 20.3117 19.5936L14.072 19.8943C13.5684 19.9186 13.0883 20.1417 12.7237 20.5255L8.52047 24.9497C7.39121 26.1384 5.37895 25.3995 5.29177 23.766L4.25888 4.41727C4.17112 2.77259 6.06948 1.70513 7.37893 2.65998L5.65376 2.00028Z" fill="black" stroke="white" strokeWidth="2.5"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

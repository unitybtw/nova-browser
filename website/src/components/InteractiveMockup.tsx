import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Plus, X, Globe, Menu, Shield, Star, Download } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const InteractiveMockup = () => {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const cursorControls = useAnimation();
  const sidebarControls = useAnimation();
  const contentControls = useAnimation();
  const aiTextControls = useAnimation();

  useEffect(() => {
    if (theme === 'dark') setIsDark(true);
    else if (theme === 'light') setIsDark(false);
    else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [theme]);

  // Animation Sequence
  useEffect(() => {
    const sequence = async () => {
      // 1. Initial wait
      await new Promise(r => setTimeout(r, 1500));
      
      // 2. Move cursor to AI Sidebar button
      await cursorControls.start({
        x: 750,
        y: 60,
        transition: { duration: 1.2, ease: "easeInOut" }
      });
      
      // 3. Click effect
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      
      // 4. Open sidebar
      sidebarControls.start({
        width: 280,
        opacity: 1,
        transition: { duration: 0.5, ease: "circOut" }
      });
      
      await new Promise(r => setTimeout(r, 800));
      
      // 5. Move cursor to input field in sidebar
      await cursorControls.start({
        x: 650,
        y: 350,
        transition: { duration: 0.8, ease: "easeInOut" }
      });
      
      await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
      await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
      
      // 6. Simulate typing and AI response
      await aiTextControls.start({ opacity: 1, y: 0, transition: { duration: 0.5 } });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // 7. Move cursor to URL bar
      await cursorControls.start({
        x: 300,
        y: 60,
        transition: { duration: 1, ease: "easeInOut" }
      });
      
      // 8. Close sidebar
      sidebarControls.start({
        width: 0,
        opacity: 0,
        transition: { duration: 0.5, ease: "circIn" }
      });
      
      // Loop
      setTimeout(sequence, 3000);
    };
    
    sequence();
  }, [cursorControls, sidebarControls, aiTextControls]);

  const frameBg = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const topbarBg = isDark ? 'bg-[#0f172a]' : 'bg-slate-100';
  const toolbarBg = isDark ? 'bg-[#1e293b]' : 'bg-slate-50';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`w-full max-w-4xl mx-auto h-[500px] rounded-2xl ${frameBg} ${borderColor} border shadow-2xl overflow-hidden flex flex-col relative`}>
      {/* Topbar (Tabs & Window Controls) */}
      <div className={`h-11 ${topbarBg} flex items-end px-3 gap-2 border-b ${borderColor} pt-2 relative`}>
        <div className="flex gap-1.5 mb-3 items-center absolute left-4">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        
        {/* Active Tab */}
        <div className={`px-4 py-2 ${toolbarBg} rounded-t-xl flex items-center gap-2 border-t border-x ${borderColor} min-w-[200px] ml-16 shadow-sm`}>
          <Globe className={`w-3.5 h-3.5 ${mutedText}`} />
          <span className={`text-xs font-medium ${textColor}`}>AuraSite - Web Design</span>
          <X className={`w-3.5 h-3.5 ${mutedText} ml-auto hover:text-red-400 cursor-pointer transition-colors`} />
        </div>
        
        <div className={`mb-2 p-1.5 rounded-lg hover:bg-slate-800/20 cursor-pointer`}>
          <Plus className={`w-4 h-4 ${mutedText}`} />
        </div>
      </div>

      {/* Toolbar (URL bar, extensions) */}
      <div className={`h-12 ${toolbarBg} flex items-center px-4 gap-3 border-b ${borderColor}`}>
        <div className="flex gap-1">
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>
        </div>
        
        {/* URL Bar */}
        <div className={`flex-1 h-8 ${isDark ? 'bg-[#0f172a]' : 'bg-white'} border ${borderColor} rounded-xl flex items-center px-3 shadow-inner relative group`}>
          <Shield className={`w-4 h-4 text-emerald-500 mr-2`} />
          <span className={`text-xs ${mutedText}`}>https://</span>
          <span className={`text-xs ${textColor}`}>aurasite.tech</span>
          
          <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Star className={`w-3.5 h-3.5 ${mutedText}`} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20`}>
            <Shield className="w-4 h-4" />
          </div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 relative`}>
            <Download className="w-4 h-4" />
          </div>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 cursor-pointer relative transition-colors shadow-sm">
            <Sparkles className="w-4 h-4" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full border border-[#1e293b]" />
          </div>
          <div className={`p-1.5 rounded-lg ${mutedText} hover:bg-slate-800/20 ml-1`}>
            <Menu className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden bg-white dark:bg-[#0f172a]">
        {/* Fake Website Content */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center relative">
          <motion.div animate={contentControls} className="text-center max-w-lg">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${textColor}`}>Welcome to AuraSite</h1>
            <p className={`text-lg ${mutedText} mb-8`}>Building the future of web design, one pixel at a time.</p>
            <div className="flex justify-center gap-4">
              <div className="h-10 w-32 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl cursor-pointer" />
              <div className={`h-10 w-32 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-xl cursor-pointer`} />
            </div>
          </motion.div>
        </div>

        {/* Animated AI Sidebar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={sidebarControls}
          className={`h-full ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-slate-50 border-slate-200'} border-l flex flex-col overflow-hidden shadow-2xl`}
        >
          <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className={`text-sm font-semibold ${textColor} whitespace-nowrap`}>Nova AI</span>
            </div>
            <X className={`w-4 h-4 ${mutedText} cursor-pointer`} />
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            <div className={`self-end max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-xs shadow-md`}>
              Summarize this website for me.
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={aiTextControls}
              className={`self-start max-w-[90%] p-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'} text-xs ${textColor} leading-relaxed shadow-sm`}
            >
              <strong>AuraSite</strong> is a modern web design platform focused on futuristic interfaces and pixel-perfect layouts. It provides tools for building next-gen web applications quickly.
            </motion.div>
          </div>
          
          <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`h-10 rounded-xl ${isDark ? 'bg-[#0f172a]' : 'bg-white border border-slate-200'} flex items-center px-3 shadow-inner`}>
              <span className={`text-xs ${mutedText}`}>Ask Nova to summarize or explain...</span>
            </div>
          </div>
        </motion.div>

        {/* Animated Cursor */}
        <motion.div
          initial={{ x: 200, y: 300 }}
          animate={cursorControls}
          className="absolute z-50 pointer-events-none drop-shadow-xl"
        >
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.65376 2.00028L21.4339 16.4815C22.6106 17.5614 21.9056 19.5168 20.3117 19.5936L14.072 19.8943C13.5684 19.9186 13.0883 20.1417 12.7237 20.5255L8.52047 24.9497C7.39121 26.1384 5.37895 25.3995 5.29177 23.766L4.25888 4.41727C4.17112 2.77259 6.06948 1.70513 7.37893 2.65998L5.65376 2.00028Z" fill="black" stroke="white" strokeWidth="2"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

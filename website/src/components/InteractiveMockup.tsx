import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, LayoutPanelLeft, Search, Plus, X, Globe, Menu, Shield } from 'lucide-react';
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

  const frameBg = isDark ? 'bg-slate-900' : 'bg-white';
  const topbarBg = isDark ? 'bg-slate-950' : 'bg-slate-100';
  const toolbarBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`w-full max-w-4xl mx-auto h-[500px] rounded-2xl ${frameBg} ${borderColor} border shadow-2xl overflow-hidden flex flex-col relative`}>
      {/* Topbar (Tabs & Window Controls) */}
      <div className={`h-12 ${topbarBg} flex items-end px-3 gap-4 border-b ${borderColor}`}>
        <div className="flex gap-1.5 mb-4 items-center">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        
        {/* Active Tab */}
        <div className={`px-4 py-2 ${toolbarBg} rounded-t-lg flex items-center gap-2 border-t border-x ${borderColor} min-w-[200px]`}>
          <Globe className={`w-3.5 h-3.5 ${mutedText}`} />
          <span className={`text-xs font-medium ${textColor}`}>AuraSite - Web Design</span>
          <X className={`w-3.5 h-3.5 ${mutedText} ml-auto`} />
        </div>
        
        <div className={`mb-3 p-1 rounded-md hover:bg-slate-800/10 cursor-pointer`}>
          <Plus className={`w-4 h-4 ${mutedText}`} />
        </div>
      </div>

      {/* Toolbar (URL bar, extensions) */}
      <div className={`h-12 ${toolbarBg} flex items-center px-4 gap-4 border-b ${borderColor}`}>
        <div className="flex gap-3">
          <div className={`w-5 h-5 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <div className={`w-5 h-5 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        </div>
        
        {/* URL Bar */}
        <div className={`flex-1 h-8 ${isDark ? 'bg-slate-950/50' : 'bg-white'} border ${borderColor} rounded-lg flex items-center px-3 shadow-inner relative`}>
          <Shield className={`w-4 h-4 text-green-500 mr-2`} />
          <span className={`text-xs ${mutedText}`}>https://</span>
          <span className={`text-xs ${textColor}`}>aurasite.tech</span>
          <div className={`ml-auto p-1 rounded-md bg-primary/10 text-primary`}>
            <Search className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className={`p-1.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
            <LayoutPanelLeft className="w-4 h-4" />
          </div>
          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 relative">
            <Sparkles className="w-4 h-4" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-purple-500 rounded-full" />
          </div>
          <div className={`p-1.5 rounded-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Menu className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden bg-white dark:bg-slate-950">
        {/* Fake Website Content */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center relative">
          <motion.div animate={contentControls} className="text-center max-w-lg">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${textColor}`}>Welcome to AuraSite</h1>
            <p className={`text-lg ${mutedText} mb-8`}>Building the future of web design, one pixel at a time.</p>
            <div className="h-10 w-32 bg-blue-500 rounded-xl mx-auto" />
          </motion.div>
        </div>

        {/* Animated AI Sidebar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={sidebarControls}
          className={`h-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} border-l flex flex-col overflow-hidden`}
        >
          <div className={`p-4 border-b ${borderColor} flex items-center gap-2`}>
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className={`text-sm font-semibold ${textColor} whitespace-nowrap`}>Nova AI Assistant</span>
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-4">
            <div className={`self-end max-w-[80%] p-3 rounded-xl rounded-tr-sm bg-purple-500 text-white text-xs`}>
              Summarize this website for me.
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={aiTextControls}
              className={`self-start max-w-[90%] p-3 rounded-xl rounded-tl-sm ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'} text-xs ${textColor} leading-relaxed`}
            >
              <strong>AuraSite</strong> is a modern web design platform focused on futuristic interfaces and pixel-perfect layouts.
            </motion.div>
          </div>
          
          <div className={`p-3 border-t ${borderColor}`}>
            <div className={`h-8 rounded-md ${isDark ? 'bg-slate-950' : 'bg-white border border-slate-200'} flex items-center px-2`}>
              <span className={`text-xs ${mutedText}`}>Ask Nova...</span>
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

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BrowserWindow } from './BrowserWindow';
import { Folder, Globe, Music } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const TabsMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [activeTab, setActiveTab] = useState<'react' | 'tailwind' | 'spotify' | 'arxiv'>('react');

  return (
    <BrowserWindow
      url={activeTab === 'react' ? 'https://react.dev' : activeTab === 'tailwind' ? 'https://tailwindcss.com' : activeTab === 'spotify' ? 'https://open.spotify.com' : 'https://arxiv.org'}
      tabs={[
        { title: activeTab === 'react' ? 'React 19 Docs' : activeTab === 'tailwind' ? 'Tailwind CSS v4' : activeTab === 'spotify' ? 'Spotify Web' : 'ArXiv Papers', active: true },
        { title: 'New Tab' }
      ]}
    >
      <div className="flex h-full w-full select-none">
        {/* Vertical Tabs Sidebar */}
        <div className={`w-56 border-r flex flex-col p-3 flex-shrink-0 transition-colors ${
          isDark ? 'bg-[#0a0e1a] border-white/10 text-white' : 'bg-slate-100/80 border-slate-200 text-slate-800'
        }`}>
          {/* Workspace Switcher */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
              isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-xs' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              Personal
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md cursor-pointer hover:opacity-100 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Work</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md cursor-pointer hover:opacity-100 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Research</span>
          </div>

          {/* Folder Group */}
          <div className="mb-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 px-1.5 py-1 rounded ${
              isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-700 bg-blue-50'
            }`}>
              <Folder className="w-3.5 h-3.5" />
              <span>Frontend Stack</span>
            </div>
            <div className="pl-2 space-y-1">
              <motion.div 
                onClick={() => setActiveTab('react')}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  activeTab === 'react'
                    ? isDark ? 'bg-white/10 text-white border-white/15 shadow-sm' : 'bg-white text-slate-900 border-slate-300 shadow-xs'
                    : isDark ? 'text-white/60 hover:bg-white/5 border-transparent' : 'text-slate-600 hover:bg-slate-200/60 border-transparent'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="truncate flex-1">React 19 Docs</span>
              </motion.div>
              <motion.div 
                onClick={() => setActiveTab('tailwind')}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  activeTab === 'tailwind'
                    ? isDark ? 'bg-white/10 text-white border-white/15 shadow-sm' : 'bg-white text-slate-900 border-slate-300 shadow-xs'
                    : isDark ? 'text-white/60 hover:bg-white/5 border-transparent' : 'text-slate-600 hover:bg-slate-200/60 border-transparent'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="truncate flex-1">Tailwind CSS v4</span>
              </motion.div>
            </div>
          </div>

          {/* Other Tabs */}
          <div className="space-y-1 mt-2">
            <motion.div 
              onClick={() => setActiveTab('spotify')}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all border ${
                activeTab === 'spotify'
                  ? isDark ? 'bg-white/10 text-white border-white/15 shadow-sm' : 'bg-white text-slate-900 border-slate-300 shadow-xs'
                  : isDark ? 'text-white/70 hover:bg-white/5 border-transparent' : 'text-slate-700 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Music className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate">Spotify Web</span>
              </div>
              {/* Equalizer Bars Animation */}
              <div className="flex items-end gap-0.5 h-3">
                <motion.div 
                  animate={{ height: ['4px', '12px', '6px', '14px', '4px'] }} 
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 bg-emerald-500 rounded-full"
                />
                <motion.div 
                  animate={{ height: ['10px', '4px', '14px', '8px', '10px'] }} 
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 bg-emerald-500 rounded-full"
                />
                <motion.div 
                  animate={{ height: ['6px', '14px', '8px', '12px', '6px'] }} 
                  transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 bg-emerald-500 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div 
              onClick={() => setActiveTab('arxiv')}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all border ${
                activeTab === 'arxiv'
                  ? isDark ? 'bg-white/10 text-white border-white/15 shadow-sm' : 'bg-white text-slate-900 border-slate-300 shadow-xs'
                  : isDark ? 'text-white/40 hover:bg-white/5 border-transparent' : 'text-slate-400 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">ArXiv AI Papers</span>
            </motion.div>
          </div>
        </div>

        {/* Web Content Preview */}
        <div className={`flex-1 p-6 overflow-hidden select-none transition-colors ${
          isDark ? 'bg-[#0f1420] text-white' : 'bg-white text-slate-900'
        }`}>
          {activeTab === 'react' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">⚛️</div>
                <div>
                  <h2 className="text-base font-bold">React 19 Documentation</h2>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Concurrent Compiler Engine</p>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                Organize complex multi-project workflows with native vertical tab grouping, custom workspaces, and low-latency tab hibernation.
              </p>
            </motion.div>
          )}

          {activeTab === 'tailwind' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">🎨</div>
                <div>
                  <h2 className="text-base font-bold">Tailwind CSS v4</h2>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>High Speed Oxide Compiler</p>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                Next generation styling primitives with zero build configuration.
              </p>
            </motion.div>
          )}

          {activeTab === 'spotify' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">🎵</div>
                <div>
                  <h2 className="text-base font-bold">Spotify Web Player</h2>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Playing: Synthwave Focus Mix</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">Background Tab Memory Hibernated</span>
                <span className="text-[10px] text-emerald-500 font-bold">0% CPU Usage</span>
              </div>
            </motion.div>
          )}

          {activeTab === 'arxiv' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">📚</div>
                <div>
                  <h2 className="text-base font-bold">ArXiv AI Publications</h2>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Deep Learning & LLM Research</p>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                Read scientific preprints in reader mode with instant AI paper summarization.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </BrowserWindow>
  );
};

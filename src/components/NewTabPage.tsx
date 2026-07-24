import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ArrowRight, ShieldCheck, ShieldAlert, Plus, X, Edit2 } from 'lucide-react';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { UserSettings } from './SettingsModal';

interface NewTabPageProps {
  onNavigate: (url: string) => void;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
}

const DEFAULT_SPEED_DIALS = [
  { name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
  { name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
  { name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com' },
  { name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', domain: 'wikipedia.org' }
];

export const NewTabPage: React.FC<NewTabPageProps> = React.memo(({ 
  onNavigate, 
  searchEngine = 'google',
  privacyShield = true
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('');

  const [speedDials, setSpeedDials] = useState<typeof DEFAULT_SPEED_DIALS>(() => {
    try {
      const saved = localStorage.getItem('nova_speed_dials');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return DEFAULT_SPEED_DIALS;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<{name: string, url: string, index: number | null}>({ name: '', url: '', index: null });

  useEffect(() => {
    localStorage.setItem('nova_speed_dials', JSON.stringify(speedDials));
  }, [speedDials]);

  const handleDeleteDial = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newDials = [...speedDials];
    newDials.splice(index, 1);
    setSpeedDials(newDials);
  };

  const handleEditDial = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setEditingDial({ ...speedDials[index], index });
    setIsEditModalOpen(true);
  };

  const handleAddDial = () => {
    setEditingDial({ name: '', url: '', index: null });
    setIsEditModalOpen(true);
  };

  const handleSaveDial = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalUrl = editingDial.url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      const urlObj = new URL(finalUrl);
      const newDial = { name: editingDial.name, url: finalUrl, domain: urlObj.hostname };
      
      const newDials = [...speedDials];
      if (editingDial.index !== null) {
        newDials[editingDial.index] = newDial;
      } else {
        newDials.push(newDial);
      }
      setSpeedDials(newDials);
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Lütfen geçerli bir URL girin.");
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    const url = formatSearchUrl(searchValue, searchEngine);
    onNavigate(url);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as any, damping: 20, stiffness: 300 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-6 py-12 overflow-hidden"
    >
      
      {/* Privacy Shield Badge */}
      <motion.div variants={itemVariants} className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium mb-6 shadow-2xs transition-all ${
        privacyShield 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' 
          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      }`}>
        {privacyShield ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-slate-400" />}
        <span>{privacyShield ? 'Privacy Shield Active' : 'Privacy Shield Disabled'}</span>
      </motion.div>

      {/* Clock & Greeting */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h1 className="text-5xl font-light tracking-tight text-slate-900 dark:text-white mb-2 font-serif">{timeStr}</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{greeting}</p>
      </motion.div>

      {/* Main Search Bar */}
      <motion.form variants={itemVariants} onSubmit={handleSearch} className="w-full max-w-2xl relative mb-10 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={`Search ${getSearchEngineName(searchEngine)} or type a URL...`}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 rounded-2xl py-4 pl-12 pr-12 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-xs hover:shadow-md outline-none transition-all"
          autoFocus
        />
        <button
          type="submit"
          aria-label="Perform search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md active:scale-95"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.form>

      {/* Speed Dials */}
      <motion.div variants={itemVariants} className="w-full max-w-2xl mb-16 relative">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 text-center">Quick Access</h2>
        <div className="grid grid-cols-5 gap-6">
          {speedDials.map((dial, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => onNavigate(dial.url)}
                className="w-full flex flex-col items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs bg-slate-50 dark:bg-slate-900 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-slate-700 transition-all overflow-hidden border border-slate-100 dark:border-slate-800 p-2.5">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${dial.domain}&sz=64`} 
                    alt={`${dial.name} icon`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 truncate w-full text-center">
                  {dial.name}
                </span>
              </button>
              {/* Edit Actions */}
              <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={(e) => handleEditDial(e, idx)}
                  className="p-1.5 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => handleDeleteDial(e, idx)}
                  className="p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Dial Button */}
          <button
            onClick={handleAddDial}
            className="flex flex-col items-center justify-center p-4 aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
          >
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium">Add New</span>
          </button>
        </div>
      </motion.div>

      {/* Edit/Add Modal */}
      <AnimatePresence>
      {isEditModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-96 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{editingDial.index !== null ? 'Edit Shortcut' : 'Add Shortcut'}</h3>
            <form onSubmit={handleSaveDial} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingDial.name}
                  onChange={e => setEditingDial(prev => ({...prev, name: e.target.value}))}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">URL</label>
                <input 
                  type="text" 
                  value={editingDial.url}
                  onChange={e => setEditingDial(prev => ({...prev, url: e.target.value}))}
                  required
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 dark:bg-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
});

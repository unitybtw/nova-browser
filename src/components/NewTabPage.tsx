import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ArrowRight, ShieldCheck, ShieldAlert, Plus, X, Edit2, Check, CheckSquare, Square, Trash2, ListTodo } from 'lucide-react';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { UserSettings } from '../App';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface NewTabPageProps {
  onNavigate: (url: string) => void;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
  newTabBackground?: string;
  backgroundCustomUrl?: string;
  unsplashCategory?: string;
}

const DEFAULT_SPEED_DIALS = [
  { name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
  { name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
  { name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com' },
  { name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', domain: 'wikipedia.org' }
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ 
  onNavigate,
  searchEngine = 'google',
  privacyShield = true,
  newTabBackground = 'default',
  backgroundCustomUrl = '',
  unsplashCategory = 'nature,architecture'
}) => {
  const [query, setQuery] = useState('');
  const [speedDials, setSpeedDials] = useState(() => {
    try {
      const saved = localStorage.getItem('nova_speed_dials');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SPEED_DIALS;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<{name: string, url: string, index: number | null}>({ name: '', url: '', index: null });

  // Todos State
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const saved = localStorage.getItem('nova_todos');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    localStorage.setItem('nova_todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const clearCompletedTodos = () => {
    setTodos(todos.filter(t => !t.completed));
  };

  useEffect(() => {
    localStorage.setItem('nova_speed_dials', JSON.stringify(speedDials));
  }, [speedDials]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    let targetUrl = query.trim();
    const isUrl = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i.test(targetUrl);

    if (isUrl) {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      onNavigate(targetUrl);
    } else {
      const searchUrl = formatSearchUrl(targetUrl, searchEngine);
      onNavigate(searchUrl);
    }
  };

  const handleAddSpeedDial = () => {
    if (!editingDial.name || !editingDial.url) return;
    let url = editingDial.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      const domain = new URL(url).hostname;
      if (editingDial.index !== null) {
        const updated = [...speedDials];
        updated[editingDial.index] = { name: editingDial.name, url, domain };
        setSpeedDials(updated);
      } else {
        setSpeedDials([...speedDials, { name: editingDial.name, url, domain }]);
      }
    } catch(e) {}

    setIsEditModalOpen(false);
    setEditingDial({ name: '', url: '', index: null });
  };

  const handleDeleteSpeedDial = (index: number) => {
    setSpeedDials(speedDials.filter((_: any, i: number) => i !== index));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const getBackgroundStyle = () => {
    if (newTabBackground === 'unsplash' || newTabBackground === 'custom_url') {
      return 'text-white';
    }
    switch (newTabBackground) {
      case 'gradient':
        return 'bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white';
      case 'mesh':
        return 'bg-[#0B0F19] text-white';
      case 'glass':
        return 'bg-slate-900/90 text-white backdrop-blur-xl';
      default:
        return 'bg-slate-50 text-slate-900 dark:bg-[#0B0F19] dark:text-white';
    }
  };

  const isDarkBg = newTabBackground !== 'default';

  const isVideoBg = newTabBackground === 'custom_url' && backgroundCustomUrl && (backgroundCustomUrl.toLowerCase().endsWith('.mp4') || backgroundCustomUrl.toLowerCase().endsWith('.webm'));

  return (
    <div className={`w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-6 select-none ${getBackgroundStyle()}`}>
      
      {/* Dynamic Backgrounds (Unsplash / Custom) */}
      {(newTabBackground === 'unsplash' || (newTabBackground === 'custom_url' && backgroundCustomUrl)) && (
        <div className="absolute inset-0 z-0">
          {isVideoBg ? (
            <video 
              src={backgroundCustomUrl} 
              autoPlay 
              loop 
              muted 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={newTabBackground === 'unsplash' ? `https://source.unsplash.com/1920x1080/?${encodeURIComponent(unsplashCategory)}` : backgroundCustomUrl} 
              alt="Background" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // If Unsplash API fails (it was recently deprecated for source.unsplash.com), fallback to a generic placeholder service
                if (newTabBackground === 'unsplash') {
                  e.currentTarget.src = `https://picsum.photos/1920/1080?blur=2`;
                }
              }}
            />
          )}
          {/* Overlay to ensure text remains readable */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Background Decorative Mesh Orbs */}
      {newTabBackground === 'mesh' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-purple-600/20 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-blue-600/15 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Main Content Area */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-3xl flex flex-col items-center gap-8 z-10"
      >
        {/* Logo / Header */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Globe className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Nova
            </h1>
          </div>
          <p className="text-xs font-medium tracking-widest uppercase opacity-40">Next-Gen Browser</p>
        </motion.div>

        {/* Omnibox / Search Form */}
        <motion.div variants={itemVariants} className="w-full">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search with ${getSearchEngineName(searchEngine)} or enter URL...`}
              className={`w-full py-4 pl-12 pr-14 text-base rounded-2xl outline-none transition-all duration-300 shadow-xl border ${
                isDarkBg 
                  ? 'bg-slate-800/60 backdrop-blur-md border-slate-700/60 text-white placeholder-slate-400 focus:bg-slate-800/90 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/20' 
                  : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 opacity-90 hover:opacity-100 active:scale-95"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Privacy Indicator */}
          <div className="flex items-center justify-between px-2 mt-2 text-xs opacity-60 font-medium">
            <div className="flex items-center gap-1.5">
              {privacyShield ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shield Active (AdBlock & Tracker Protection)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Shield Disabled</span>
                </>
              )}
            </div>
            <span>Engine: {getSearchEngineName(searchEngine)}</span>
          </div>
        </motion.div>

        {/* Speed Dials Grid */}
        <motion.div variants={itemVariants} className="w-full">
          <div className="grid grid-cols-5 gap-4">
            {speedDials.map((dial: any, idx: number) => (
              <div key={idx} className="relative group">
                <button
                  onClick={() => onNavigate(dial.url)}
                  className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-3 gap-2 transition-all duration-300 border shadow-md hover:scale-105 active:scale-95 ${
                    isDarkBg 
                      ? 'bg-slate-800/40 backdrop-blur-md border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600' 
                      : 'bg-white/70 backdrop-blur-md border-slate-200/70 hover:bg-white hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-700/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center overflow-hidden p-2 shadow-inner">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${dial.domain}&sz=64`}
                      alt={dial.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Globe className="w-5 h-5 opacity-40 hidden group-has-[:failed]:block" />
                  </div>
                  <span className="text-xs font-semibold truncate max-w-full">{dial.name}</span>
                </button>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-slate-900/80 rounded-lg p-0.5 backdrop-blur-xs">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDial({ name: dial.name, url: dial.url, index: idx });
                      setIsEditModalOpen(true);
                    }}
                    className="p-1 text-slate-300 hover:text-white rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpeedDial(idx);
                    }}
                    className="p-1 text-red-400 hover:text-red-300 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {speedDials.length < 10 && (
              <button
                onClick={() => {
                  setEditingDial({ name: '', url: '', index: null });
                  setIsEditModalOpen(true);
                }}
                className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-3 gap-2 transition-all duration-300 border border-dashed opacity-60 hover:opacity-100 hover:scale-105 active:scale-95 ${
                  isDarkBg 
                    ? 'border-slate-700 hover:bg-slate-800/40' 
                    : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700'
                }`}
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-medium">Add Shortcut</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ToDo / Tasks Widget */}
      <motion.div 
        variants={itemVariants}
        className={`absolute bottom-8 right-8 w-84 rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 border ${
          isDarkBg 
            ? 'bg-slate-900/70 backdrop-blur-xl border-slate-700/60 shadow-black/40' 
            : 'bg-white/85 backdrop-blur-xl border-slate-200/90 dark:bg-slate-800/85 dark:border-slate-700/80'
        }`}
        style={{ maxHeight: '380px' }}
      >
        <div className={`px-5 py-3.5 border-b font-semibold text-sm flex justify-between items-center ${isDarkBg ? 'border-slate-700/50 text-white' : 'border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'}`}>
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-indigo-400" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium opacity-60 bg-slate-500/10 px-2 py-0.5 rounded-full">
              {todos.filter(t => !t.completed).length} left
            </span>
            {todos.some(t => t.completed) && (
              <button
                onClick={clearCompletedTodos}
                className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors opacity-80 hover:opacity-100 ml-1"
                title="Clear completed tasks"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {todos.map(todo => (
              <motion.div 
                key={todo.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={() => toggleTodo(todo.id)}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl group cursor-pointer transition-all ${
                  todo.completed 
                    ? 'opacity-60 bg-slate-500/5' 
                    : isDarkBg 
                      ? 'hover:bg-white/10' 
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                    todo.completed 
                      ? 'bg-indigo-500 text-white shadow-xs shadow-indigo-500/30' 
                      : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                  }`}>
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className={`text-sm truncate select-none transition-all ${
                    todo.completed ? 'line-through opacity-70' : ''
                  } ${isDarkBg ? 'text-slate-100' : 'text-slate-800 dark:text-slate-200'}`}>
                    {todo.text}
                  </span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTodo(todo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-all shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs opacity-50 space-y-1">
              <CheckSquare className="w-6 h-6 stroke-[1.5] text-indigo-400" />
              <span>No tasks for today. All done!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleAddTodo} className={`p-3 border-t ${isDarkBg ? 'border-slate-700/50' : 'border-slate-200/80 dark:border-slate-700/80'}`}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new task..."
              className={`w-full bg-slate-500/10 px-3 py-2 pr-8 rounded-xl text-sm outline-none placeholder-opacity-50 transition-all focus:ring-2 focus:ring-indigo-500/40 ${
                isDarkBg ? 'text-white placeholder-slate-400' : 'text-slate-800 dark:text-white placeholder-slate-500'
              }`}
            />
            {newTodo.trim() && (
              <button 
                type="submit" 
                className="absolute right-2 p-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
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
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-lg font-bold mb-4">{editingDial.index !== null ? 'Edit Shortcut' : 'Add Shortcut'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold opacity-70 block mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingDial.name}
                  onChange={(e) => setEditingDial({ ...editingDial, name: e.target.value })}
                  placeholder="e.g. YouTube"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-70 block mb-1">URL</label>
                <input 
                  type="text" 
                  value={editingDial.url}
                  onChange={(e) => setEditingDial({ ...editingDial, url: e.target.value })}
                  placeholder="e.g. https://youtube.com"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSpeedDial}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
};

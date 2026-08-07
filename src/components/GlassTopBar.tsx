import React, { useState } from 'react';
import { Tab } from '../types/browser';

interface GlassTopBarProps {
  activeTabId: string;
  tabs: Tab[];
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onOpenSettings: () => void;
  onOpenExtensions?: () => void;
}

export const GlassTopBar: React.FC<GlassTopBarProps> = ({
  activeTabId,
  tabs,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onOpenSettings,
  onOpenExtensions
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [inputValue, setInputValue] = useState(activeTab?.url || '');

  React.useEffect(() => {
    setInputValue(activeTab?.url || '');
  }, [activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNavigate(inputValue);
    }
  };

  return (
    <header className="h-omnibox-height w-full sticky top-0 z-40 bg-transparent flex items-center justify-between px-lg gap-md shadow-none font-label-md text-label-md text-on-surface dark:text-on-surface rounded-full backdrop-blur-xl border border-white/10 glass-panel drag-region mt-2 mx-4" style={{ width: 'calc(100% - 32px)' }}>
      {/* Navigation Actions */}
      <div className="flex items-center gap-1 no-drag">
        <button 
          onClick={onGoBack}
          disabled={!activeTab?.canGoBack}
          aria-label="Back" 
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <button 
          onClick={onGoForward}
          disabled={!activeTab?.canGoForward}
          aria-label="Forward" 
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
        <button 
          onClick={onReload}
          aria-label="Refresh" 
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      {/* Central Omnibox */}
      <div className="flex-1 max-w-2xl mx-auto relative group no-drag">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            {activeTab?.url?.startsWith('https') ? 'lock' : 'public'}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="w-full">
          <input 
            autoComplete="off" 
            className="w-full h-10 bg-white/5 border border-white/10 rounded-full pl-10 pr-12 text-center font-mono-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-0 omnibox-glow transition-all duration-300" 
            spellCheck="false" 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search or enter address"
          />
        </form>
        <div className="absolute inset-y-0 right-3 flex items-center gap-2">
          <button className="p-1 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">star</span>
          </button>
        </div>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-2 no-drag">
        <button onClick={onOpenExtensions} className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">extension</span>
        </button>
        <button onClick={onOpenSettings} className="p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { Tab } from '../types/browser';

interface GlassSidebarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: () => void;
  onOpenSettings: () => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onOpenSettings
}) => {
  return (
    <aside className="w-[260px] flex-col h-screen sticky top-0 left-0 border-r border-white/20 bg-surface-container/40 dark:bg-surface-container/40 backdrop-blur-xl hidden md:flex transition-all duration-300 ease-in-out z-20 shadow-none font-body-md text-body-md text-primary dark:text-primary backdrop-blur-[20px]" id="sidebar">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-lg shrink-0">
        <div className="flex items-center gap-3 drag-region">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary leading-tight">Nova</span>
            <span className="font-label-md text-label-md text-on-surface-variant opacity-70">Premium Browser</span>
          </div>
        </div>
        <button 
          onClick={onNewTab}
          aria-label="New Tab" 
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 no-drag"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>

      {/* Vertical Tabs */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        <div className="mb-4 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider opacity-60">Open Tabs</div>
        
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const title = tab.title || (tab.url === 'nova://newtab' ? 'New Tab' : tab.url);
          
          if (isActive) {
            return (
              <a 
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="group bg-gradient-to-r from-secondary-container to-primary-container text-on-primary-container rounded-full mx-2 px-4 py-2 flex items-center justify-between gap-3 scale-95 active:scale-90 transition-transform relative overflow-hidden cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  {tab.favicon ? (
                    <img src={tab.favicon} className="w-4 h-4 shrink-0" alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                  )}
                  <span className="truncate font-medium">{title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/20 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                {/* Active Indicator Dot */}
                <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(255,184,105,0.8)]"></div>
              </a>
            );
          }

          return (
            <a 
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="group text-on-surface-variant hover:text-on-surface rounded-full mx-2 px-4 py-2 flex items-center justify-between gap-3 hover:bg-white/10 transition-all duration-300 scale-95 active:scale-90 relative cursor-pointer"
            >
              <div className="flex items-center gap-3 truncate">
                {tab.favicon ? (
                  <img src={tab.favicon} className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100" alt="" />
                ) : (
                  <span className="material-symbols-outlined text-lg shrink-0">public</span>
                )}
                <span className="truncate">{title}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </a>
          );
        })}

        <div className="mt-8 mb-4 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider opacity-60">System</div>
        <a 
          onClick={onOpenSettings}
          className="group text-on-surface-variant hover:text-on-surface rounded-full mx-2 px-4 py-2 flex items-center justify-between gap-3 hover:bg-white/10 transition-all duration-300 scale-95 active:scale-90 relative cursor-pointer"
        >
          <div className="flex items-center gap-3 truncate">
            <span className="material-symbols-outlined text-lg shrink-0">settings</span>
            <span className="truncate">Settings</span>
          </div>
        </a>
      </nav>

      {/* User Area Bottom */}
      <div className="p-4 mt-auto border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <img 
            className="w-10 h-10 rounded-full object-cover border border-white/10" 
            alt="Profile" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuByNLZCP-693GuHi1mYsXiW4vq0mg3UrSZxA6SD7niIQ4tA4J5AMKNuvFeygnxOE6tdRjZLTLM4hn2Nlp2LU1Txmh4eXgcUIUbY5FAGKfkbQC4ET51TkOF0esDoIuD74ezFQXXG7xqcOhBdDxwRXHSw3vE7KkVR70GM-CZJYosGMbQYh1bETg7vg2J0X7pKZksRd4cGp2yI_HD8B53t53TLjTenQlihD99wHqATQ9uEhpfOzUIaX_Za"
          />
          <div className="flex flex-col truncate">
            <span className="font-medium text-sm">Alex Chen</span>
            <span className="font-label-md text-xs text-on-surface-variant opacity-70">Pro Workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

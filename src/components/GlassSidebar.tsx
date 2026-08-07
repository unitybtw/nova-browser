import React, { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`${isCollapsed ? 'w-[80px]' : 'w-[280px]'} flex-col h-screen sticky top-0 left-0 border-r border-white/20 bg-surface-container/30 dark:bg-surface-container/30 backdrop-blur-2xl hidden md:flex transition-all duration-300 ease-in-out z-20 shadow-2xl font-body-md text-body-md text-on-background dark:text-on-background`} 
      id="sidebar"
    >
      {/* Sidebar Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-lg shrink-0`}>
        <div className="flex items-center gap-3 drag-region overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary via-tertiary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-on-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap transition-opacity duration-300">
              <span className="font-headline-md text-headline-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary leading-tight">Nova</span>
              <span className="font-label-md text-label-md text-on-surface-variant opacity-70">Browser</span>
            </div>
          )}
        </div>
      </div>

      <div className={`px-4 mb-4 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-on-surface-variant no-drag shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined text-[20px]">{isCollapsed ? 'menu_open' : 'menu'}</span>
        </button>

        {!isCollapsed && (
          <button 
            onClick={onNewTab}
            aria-label="New Tab" 
            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors no-drag shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="px-4 mb-4 flex justify-center items-center">
          <button 
            onClick={onNewTab}
            aria-label="New Tab" 
            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors no-drag shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      )}

      {/* Vertical Tabs */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-hide">
        {!isCollapsed && <div className="mb-2 px-3 font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest opacity-60">Open Tabs</div>}
        
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const title = tab.title || (tab.url === 'nova://newtab' ? 'New Tab' : tab.url);
          
          if (isActive) {
            return (
              <a 
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative bg-white/10 dark:bg-white/10 text-on-surface rounded-xl mx-2 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} py-2.5 flex items-center gap-3 transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.05)]`}
              >
                {/* Gradient Left Border */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/5 bg-gradient-to-b from-primary via-tertiary to-secondary rounded-r-full shadow-[0_0_10px_rgba(255,184,105,0.5)]"></div>
                
                <div className="flex items-center gap-3 truncate w-full pl-2">
                  {tab.favicon ? (
                    <img src={tab.favicon} className="w-5 h-5 shrink-0 rounded-sm" alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px] shrink-0 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                  )}
                  {!isCollapsed && <span className="truncate font-medium text-sm w-full pr-6">{title}</span>}
                </div>
                
                {!isCollapsed && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </a>
            );
          }

          return (
            <a 
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group text-on-surface-variant hover:text-on-surface rounded-xl mx-2 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} py-2.5 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 cursor-pointer relative`}
            >
              <div className="flex items-center gap-3 truncate w-full pl-2">
                {tab.favicon ? (
                  <img src={tab.favicon} className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity rounded-sm" alt="" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">public</span>
                )}
                {!isCollapsed && <span className="truncate text-sm w-full pr-6">{title}</span>}
              </div>
              
              {!isCollapsed && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </a>
          );
        })}

        {!isCollapsed && <div className="mt-6 mb-2 px-3 font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest opacity-60">System</div>}
        <a 
          onClick={onOpenSettings}
          className={`group text-on-surface-variant hover:text-on-surface rounded-xl mx-2 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} py-2.5 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 cursor-pointer`}
        >
          <div className="flex items-center gap-3 truncate pl-2">
            <span className="material-symbols-outlined text-[20px] shrink-0">settings</span>
            {!isCollapsed && <span className="truncate text-sm">Settings</span>}
          </div>
        </a>
      </nav>

      {/* User Area Bottom */}
      <div className={`p-4 mt-auto border-t border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-0' : 'gap-3 px-3 py-2.5'} rounded-xl hover:bg-white/5 transition-colors cursor-pointer`}>
          <img 
            className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shrink-0" 
            alt="Profile" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuByNLZCP-693GuHi1mYsXiW4vq0mg3UrSZxA6SD7niIQ4tA4J5AMKNuvFeygnxOE6tdRjZLTLM4hn2Nlp2LU1Txmh4eXgcUIUbY5FAGKfkbQC4ET51TkOF0esDoIuD74ezFQXXG7xqcOhBdDxwRXHSw3vE7KkVR70GM-CZJYosGMbQYh1bETg7vg2J0X7pKZksRd4cGp2yI_HD8B53t53TLjTenQlihD99wHqATQ9uEhpfOzUIaX_Za"
          />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-medium text-sm text-on-surface">Alex Chen</span>
              <span className="font-label-sm text-[11px] text-primary">Pro Workspace</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

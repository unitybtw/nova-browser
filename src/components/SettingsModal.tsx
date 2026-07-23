import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Search, ShieldCheck, Moon, Sun, Monitor, Check, Download, Upload } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export interface UserSettings {
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber';
  showBookmarksBar: boolean;
  useVerticalTabs: boolean;
  mcpServerEnabled: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportData,
  onImportData
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl h-[520px] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Browser Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Preferences, Privacy & Search</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Default Search Engine */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Default Search Engine
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'google', name: 'Google', desc: 'Default fast search' },
                { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
                { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
                { id: 'bing', name: 'Microsoft Bing', desc: 'AI search' },
                { id: 'ecosia', name: 'Ecosia', desc: 'Plant-tree search' }
              ].map(engine => (
                <button
                  key={engine.id}
                  onClick={() => onUpdateSettings({ searchEngine: engine.id as any })}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    settings.searchEngine === engine.id
                      ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-medium shadow-xs'
                      : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold">{engine.name}</p>
                    <p className="text-[10px] text-slate-500">{engine.desc}</p>
                  </div>
                  {settings.searchEngine === engine.id && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Shield */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Ad & Tracker Blocking</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Block malicious scripts, ads, and trackers across all sites.</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ privacyShield: !settings.privacyShield })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.privacyShield ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.privacyShield ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Accent Color Selection */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Accent Theme Color</label>
            <div className="flex items-center gap-3">
              {[
                { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
                { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
                { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
                { id: 'rose', name: 'Rose', color: 'bg-rose-500' },
                { id: 'amber', name: 'Amber', color: 'bg-amber-500' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => onUpdateSettings({ accentColor: c.id as any })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                    settings.accentColor === c.id
                      ? 'border-slate-800 bg-slate-50 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${c.color}`} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Default Font Size</label>
            <div className="flex items-center gap-3">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ fontSize: size })}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border capitalize transition-all ${
                    settings.fontSize === size
                      ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Bookmarks Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Yer İmleri Çubuğu</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Adres çubuğunun altında favori sitelerinizi gösterir</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showBookmarksBar ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showBookmarksBar ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Vertical Tabs */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Dikey Sekmeler (Vertical Tabs)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Sekmeleri ekranın sol tarafında geniş bir panelde gösterir</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ useVerticalTabs: !settings.useVerticalTabs })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.useVerticalTabs ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.useVerticalTabs ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* MCP Server */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Harici AI Kontrolü (MCP Sunucusu)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Dışarıdaki yapay zeka ajanlarının tarayıcıyı kontrol etmesine izin ver.</div>
              </div>
              <button
                onClick={async () => {
                  const newVal = !settings.mcpServerEnabled;
                  onUpdateSettings({ mcpServerEnabled: newVal });
                  if (newVal) {
                    await (window as any).electronAPI?.startMcpServer?.();
                  } else {
                    await (window as any).electronAPI?.stopMcpServer?.();
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.mcpServerEnabled ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.mcpServerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.mcpServerEnabled && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">MCP Bağlantı Adresi (SSE):</p>
                <code className="text-[11px] bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700/50 block text-slate-700 dark:text-slate-300 select-all font-mono">
                  http://localhost:3020/mcp
                </code>
                <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-2">
                  Stdio kullanan yapay zekalar için terminalde <br/> <span className="font-mono bg-purple-100 dark:bg-purple-900/50 px-1 rounded">node browser-mcp-proxy.js</span> komutunu çalıştırabilirsiniz.
                </p>
              </div>
            )}
          </div>
          
          
          {/* Data Backup & Restore */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Backup & Restore Data
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={onExportData}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-2xs"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Export Backup (JSON)</span>
                </button>

                <label className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Import Backup (JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onImportData) onImportData(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
});

import React, { useState } from 'react';
import { Download, Upload, Check, Zap, Loader2, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import { testOpenAIConnection } from '../../services/openAiCompatibleClient';
import { aiAgent } from '../../services/aiAgent';

export interface AdvancedSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onPurgeMemory?: () => Promise<void> | void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  settings,
  onUpdateSettings,
  onPurgeMemory,
  onExportData,
  onImportData,
}) => {
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [purgedFeedback, setPurgedFeedback] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const { setSafeTimeout } = useSafeTimeout();

  const handleBackendChange = (provider: 'webgpu' | 'custom') => {
    onUpdateSettings({ aiProvider: provider });
    aiAgent.configureBackend(
      provider,
      settings.aiCustomEndpoint,
      settings.aiCustomModel,
      settings.aiCustomApiKey
    );
  };

  const handleCustomConfigChange = (field: 'aiCustomEndpoint' | 'aiCustomModel' | 'aiCustomApiKey', val: string) => {
    const next = { [field]: val };
    onUpdateSettings(next);
    aiAgent.configureBackend(
      settings.aiProvider ?? 'webgpu',
      field === 'aiCustomEndpoint' ? val : settings.aiCustomEndpoint,
      field === 'aiCustomModel' ? val : settings.aiCustomModel,
      field === 'aiCustomApiKey' ? val : settings.aiCustomApiKey
    );
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testOpenAIConnection(
        settings.aiCustomEndpoint || 'http://localhost:4000/v1',
        settings.aiCustomApiKey,
        settings.aiCustomModel
      );
      if (res.ok) {
        const countText = res.models && res.models.length > 0 ? `${res.models.length} model(s) discovered` : 'Endpoint active';
        setTestResult({
          ok: true,
          message: `Connected successfully in ${res.latencyMs}ms (${countText}).`,
          models: res.models
        });
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Connection failed'
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: e?.message || 'Connection failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Features</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
          {/* AI Backend Provider Selection */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  AI Assistant Backend Provider
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose between on-device WebGPU models or a local/remote OpenAI-compatible proxy (LiteLLM, Ollama, LM Studio).
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleBackendChange('webgpu')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    (settings.aiProvider ?? 'webgpu') === 'webgpu'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  On-Device WebGPU
                </button>
                <button
                  type="button"
                  onClick={() => handleBackendChange('custom')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    settings.aiProvider === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  LiteLLM / Ollama
                </button>
              </div>
            </div>

            {settings.aiProvider === 'custom' && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">
                {/* Endpoint URL Input & Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      OpenAI-Compatible Base URL
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleCustomConfigChange('aiCustomEndpoint', 'http://localhost:4000/v1')}
                        className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:text-blue-500 font-mono text-[10px] cursor-pointer"
                      >
                        LiteLLM (4000)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomConfigChange('aiCustomEndpoint', 'http://localhost:11434/v1')}
                        className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:text-blue-500 font-mono text-[10px] cursor-pointer"
                      >
                        Ollama (11434)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomConfigChange('aiCustomEndpoint', 'http://localhost:1234/v1')}
                        className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:text-blue-500 font-mono text-[10px] cursor-pointer"
                      >
                        LM Studio (1234)
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.aiCustomEndpoint ?? 'http://localhost:4000/v1'}
                    onChange={(e) => handleCustomConfigChange('aiCustomEndpoint', e.target.value)}
                    placeholder="http://localhost:4000/v1"
                    className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Route requests to any OpenAI-compatible server. Suffix `/v1` is automatically normalized.
                  </p>
                </div>

                {/* Model Name & API Key */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      value={settings.aiCustomModel ?? ''}
                      onChange={(e) => handleCustomConfigChange('aiCustomModel', e.target.value)}
                      placeholder="e.g. llama3.3, mistral, gpt-4o, qwen2.5-coder"
                      className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Leave empty to use server default, or specify an exact model name.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      API Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={settings.aiCustomApiKey ?? ''}
                      onChange={(e) => handleCustomConfigChange('aiCustomApiKey', e.target.value)}
                      placeholder="Bearer token (if required by proxy)"
                      className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Sent as Authorization Bearer header. Stored securely on your device.
                    </p>
                  </div>
                </div>

                {/* Connection Test & Discovered Models */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={testingConnection}
                      onClick={handleTestConnection}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Testing Endpoint...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          Test Connection
                        </>
                      )}
                    </button>

                    {testResult && (
                      <div className={`text-xs flex items-center gap-1.5 ${testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {testResult?.models && testResult.models.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        Click a discovered model to select it:
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {testResult.models.slice(0, 20).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleCustomConfigChange('aiCustomModel', m)}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              settings.aiCustomModel === m
                                ? 'bg-blue-500 text-white border-blue-600'
                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Link Preview (Hover Summaries)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatically reads and summarizes links when you hover over them. (Uses local WebLLM)</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle AI link preview"
              checked={settings.aiLinkPreviewEnabled}
              onToggle={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
              activeColorClass="bg-indigo-500"
            />
          </div>

          {/* Password Manager */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password Manager</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Offer to save and autofill passwords on websites. Credentials are encrypted on this device.</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle password manager"
              checked={settings.passwordManagerEnabled}
              onToggle={() => onUpdateSettings({ passwordManagerEnabled: !settings.passwordManagerEnabled })}
              activeColorClass="bg-indigo-500"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Memory & Performance</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
          {/* Automatic Tab Hibernation */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Automatic Tab Hibernation (Memory Saver)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unloads inactive background tabs from RAM to keep the browser lightning fast</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle automatic tab hibernation"
              checked={(settings.tabHibernationEnabled ?? true)}
              onToggle={() => onUpdateSettings({ tabHibernationEnabled: !(settings.tabHibernationEnabled ?? true) })}
            />
          </div>

          {(settings.tabHibernationEnabled ?? true) && (
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hibernation Inactivity Timeout</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time after which unused tabs are suspended to save RAM</div>
              </div>
              <select
                value={settings.hibernationTimeoutMinutes ?? 10}
                onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
                className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          )}

          {/* Energy Saver Mode */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Energy Saver Mode (Battery & CPU)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Throttles heavy background canvas shaders and limits particle effects to extend laptop battery life</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle energy saver mode"
              checked={settings.energySaverMode}
              onToggle={() => onUpdateSettings({ energySaverMode: !(settings.energySaverMode ?? false) })}
              activeColorClass="bg-emerald-500"
            />
          </div>

          {/* Link Preload & DNS Prefetching */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">DNS Prefetching & Link Pre-warming (Speed Booster)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pre-resolves domain names and opens anticipatory sockets on link hover for instant page loads</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle DNS prefetching and link pre-warming"
              checked={(settings.preloadDnsEnabled ?? true)}
              onToggle={() => onUpdateSettings({ preloadDnsEnabled: !(settings.preloadDnsEnabled ?? true) })}
            />
          </div>

          {/* Smooth Scrolling Engine */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hardware-Accelerated Smooth Scrolling</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Interpolates page scrolling with GPU composited physics for high refresh rate monitors</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle smooth scrolling"
              checked={(settings.smoothScrollingEnabled ?? true)}
              onToggle={() => onUpdateSettings({ smoothScrollingEnabled: !(settings.smoothScrollingEnabled ?? true) })}
            />
          </div>

          {/* Instant Memory Purge Action */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Instant RAM & Cache Purge</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immediately hibernates all background tabs, clears thumbnail cache, and triggers V8 garbage collection</div>
            </div>
            <button
              onClick={async () => {
                setIsPurgingMemory(true);
                try {
                  if (onPurgeMemory) await onPurgeMemory();
                } catch (_) {}
                setSafeTimeout(() => {
                  setIsPurgingMemory(false);
                  setPurgedFeedback(true);
                  setSafeTimeout(() => setPurgedFeedback(false), 3000);
                }, 500);
              }}
              disabled={isPurgingMemory}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isPurgingMemory ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Purging RAM...</span>
                </>
              ) : purgedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">RAM Purged!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Purge RAM Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">System & Developer</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use hardware acceleration</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use GPU to render web pages faster (requires restart)</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle hardware acceleration"
              checked={settings.hardwareAcceleration}
              onToggle={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
            />
          </div>

          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Developer Mode</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable "Inspect Element" in right-click menu and advanced tools</div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle developer mode"
              checked={settings.developerMode}
              onToggle={() => onUpdateSettings({ developerMode: !settings.developerMode })}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Backup & Restore</h2>
        <div className="flex gap-4">
          <button
            onClick={onExportData}
            className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/15 rounded-xl flex items-center justify-center text-blue-500">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Export Backup</p>
              <p className="text-xs text-slate-500 mt-1">Save bookmarks & settings to a JSON file</p>
            </div>
          </button>

          <label className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-3 group cursor-pointer">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-500">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Import Backup</p>
              <p className="text-xs text-slate-500 mt-1">Restore from a JSON backup file</p>
            </div>
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
      </section>

    </div>
  );
};

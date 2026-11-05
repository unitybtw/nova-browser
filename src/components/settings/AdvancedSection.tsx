import React, { useState } from 'react';
import {
  Download,
  Upload,
  Check,
  Zap,
  Loader2,
  Server,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Cloud,
  Globe,
  Sliders,
  Sparkles,
  Code,
  ExternalLink,
  Key,
  RotateCcw
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import {
  testOpenAIConnection,
  AI_PROVIDER_PRESETS,
  getProviderPreset
} from '../../services/openAiCompatibleClient';
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

  const currentPresetId = (settings.aiProvider === 'webgpu')
    ? 'webgpu'
    : (settings.aiProviderPreset || 'ollama');

  const selectedPresetDef = getProviderPreset(settings.aiProviderPreset || 'ollama');

  const handleSelectPreset = (presetId: string) => {
    if (presetId === 'webgpu') {
      onUpdateSettings({ aiProvider: 'webgpu' });
      aiAgent.configureBackend(
        'webgpu',
        settings.aiCustomEndpoint,
        settings.aiCustomModel,
        settings.aiCustomApiKey,
        'ollama',
        settings.aiTemperature ?? 0.2,
        settings.aiSystemPersonality ?? 'balanced'
      );
      setTestResult(null);
      return;
    }

    const preset = getProviderPreset(presetId);
    const updates: Partial<UserSettings> = {
      aiProvider: 'custom',
      aiProviderPreset: presetId as any,
      aiCustomEndpoint: preset.defaultEndpoint,
      aiCustomModel: preset.defaultModel || settings.aiCustomModel || '',
    };
    onUpdateSettings(updates);
    aiAgent.configureBackend(
      'custom',
      preset.defaultEndpoint,
      preset.defaultModel || settings.aiCustomModel || '',
      settings.aiCustomApiKey,
      presetId,
      settings.aiTemperature ?? 0.2,
      settings.aiSystemPersonality ?? 'balanced'
    );
    setTestResult(null);
  };

  const handleCustomConfigChange = (
    field: 'aiCustomEndpoint' | 'aiCustomModel' | 'aiCustomApiKey',
    val: string
  ) => {
    const next = { [field]: val };
    onUpdateSettings(next);
    aiAgent.configureBackend(
      settings.aiProvider ?? 'webgpu',
      field === 'aiCustomEndpoint' ? val : settings.aiCustomEndpoint,
      field === 'aiCustomModel' ? val : settings.aiCustomModel,
      field === 'aiCustomApiKey' ? val : settings.aiCustomApiKey,
      settings.aiProviderPreset ?? 'ollama',
      settings.aiTemperature ?? 0.2,
      settings.aiSystemPersonality ?? 'balanced'
    );
  };

  const handleTemperatureChange = (val: number) => {
    onUpdateSettings({ aiTemperature: val });
    aiAgent.configureBackend(
      settings.aiProvider ?? 'webgpu',
      settings.aiCustomEndpoint,
      settings.aiCustomModel,
      settings.aiCustomApiKey,
      settings.aiProviderPreset ?? 'ollama',
      val,
      settings.aiSystemPersonality ?? 'balanced'
    );
  };

  const handlePersonalityChange = (val: 'balanced' | 'creative' | 'code' | 'concise') => {
    onUpdateSettings({ aiSystemPersonality: val });
    aiAgent.configureBackend(
      settings.aiProvider ?? 'webgpu',
      settings.aiCustomEndpoint,
      settings.aiCustomModel,
      settings.aiCustomApiKey,
      settings.aiProviderPreset ?? 'ollama',
      settings.aiTemperature ?? 0.2,
      val
    );
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const endpointToTest = settings.aiCustomEndpoint || selectedPresetDef.defaultEndpoint;
      const res = await testOpenAIConnection(
        endpointToTest,
        settings.aiCustomApiKey,
        settings.aiCustomModel
      );
      if (res.ok) {
        const countText = res.models && res.models.length > 0 ? `${res.models.length} model(s) discovered` : 'Endpoint verified';
        setTestResult({
          ok: true,
          message: `Connected successfully (${res.latencyMs}ms). ${countText}.`,
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
          <div className="p-5 space-y-5">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                AI Assistant Backend Provider
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select where your AI Assistant runs. Run models locally with zero data leakage or connect to ultra-fast inference APIs.
              </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* WebGPU Tile */}
              <button
                type="button"
                onClick={() => handleSelectPreset('webgpu')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                  (settings.aiProvider ?? 'webgpu') === 'webgpu'
                    ? 'border-blue-500/80 bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Cpu className="w-4 h-4 text-emerald-500 shrink-0" />
                  {(settings.aiProvider ?? 'webgpu') === 'webgpu' && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight mt-1.5">WebGPU</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    On-Device Private
                  </div>
                </div>
              </button>

              {/* Dynamic Presets from AI_PROVIDER_PRESETS */}
              {AI_PROVIDER_PRESETS.map((preset) => {
                const isSelected = settings.aiProvider === 'custom' && currentPresetId === preset.id;
                let IconComponent = Server;
                if (preset.id === 'openrouter') IconComponent = Globe;
                else if (preset.id === 'groq') IconComponent = Zap;
                else if (preset.id === 'openai') IconComponent = Sparkles;
                else if (preset.id === 'deepseek') IconComponent = Code;
                else if (preset.id === 'custom') IconComponent = Sliders;
                else if (preset.id === 'lmstudio') IconComponent = Cpu;

                const categoryBadge = preset.category === 'local' ? 'Local' : preset.category === 'cloud' ? 'Cloud' : 'Custom';

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                      isSelected
                        ? 'border-blue-500/80 bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <IconComponent className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className={`text-[9.5px] uppercase font-mono px-1 py-0.2 rounded ${
                        preset.category === 'local'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : preset.category === 'cloud'
                          ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {categoryBadge}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-tight mt-1.5 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                        {preset.category === 'local' ? 'Local daemon' : preset.category === 'cloud' ? 'API service' : 'Proxy URL'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom / Preset Configuration Details */}
            {settings.aiProvider === 'custom' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-300">
                {/* Active Preset Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {selectedPresetDef.name} Configuration
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedPresetDef.description}
                    </p>
                  </div>
                  {selectedPresetDef.docsUrl && (
                    <a
                      href={selectedPresetDef.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      Documentation
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Endpoint URL Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      OpenAI-Compatible Base URL
                    </label>
                    {settings.aiCustomEndpoint !== selectedPresetDef.defaultEndpoint && (
                      <button
                        type="button"
                        onClick={() => handleCustomConfigChange('aiCustomEndpoint', selectedPresetDef.defaultEndpoint)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to default ({selectedPresetDef.defaultEndpoint})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.aiCustomEndpoint ?? selectedPresetDef.defaultEndpoint}
                    onChange={(e) => handleCustomConfigChange('aiCustomEndpoint', e.target.value)}
                    placeholder={selectedPresetDef.defaultEndpoint}
                    className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Route requests to any OpenAI-compatible server. Suffix <code className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded">/v1</code> is automatically normalized.
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
                      placeholder={selectedPresetDef.defaultModel || 'e.g. llama3.3, claude-3-5-sonnet, gpt-4o'}
                      className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />

                    {/* Popular Models Chips */}
                    {selectedPresetDef.popularModels && selectedPresetDef.popularModels.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                          Popular models:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedPresetDef.popularModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleCustomConfigChange('aiCustomModel', m)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                settings.aiCustomModel === m
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      API Key {selectedPresetDef.requiresApiKey ? '(Required)' : '(Optional)'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={settings.aiCustomApiKey ?? ''}
                        onChange={(e) => handleCustomConfigChange('aiCustomApiKey', e.target.value)}
                        placeholder={selectedPresetDef.apiKeyPlaceholder || 'Bearer token (if required)'}
                        className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs pl-8 pr-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {selectedPresetDef.requiresApiKey
                        ? 'Bearer token sent securely with each inference request.'
                        : 'Local servers (Ollama, LM Studio) typically require no key.'}
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
                        {testResult.models.slice(0, 30).map((m) => (
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

            {/* Model Temperature & System Personality Section */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      Inference Temperature
                    </label>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Controls answer randomness and creativity.
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-700">
                    {(settings.aiTemperature ?? 0.2).toFixed(2)}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.aiTemperature ?? 0.2}
                  onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.5)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              {/* System Personality */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    Assistant Personality & Tone
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Adjusts prompt instructions and style.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'balanced', label: 'Balanced', desc: 'Thoughtful & helpful' },
                    { id: 'code', label: 'Code & Dev', desc: 'Clean diffs, no filler' },
                    { id: 'concise', label: 'Concise', desc: 'Direct bullet points' },
                    { id: 'creative', label: 'Creative', desc: 'Exploratory & witty' }
                  ].map((p) => {
                    const isSelected = (settings.aiSystemPersonality ?? 'balanced') === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePersonalityChange(p.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold leading-tight">{p.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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

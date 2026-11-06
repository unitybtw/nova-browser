import React, { useState, useMemo } from 'react';
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
  RotateCcw,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  Search,
  CheckCheck
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
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
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number; models?: string[] } | null>(null);
  const [providerTab, setProviderTab] = useState<'all' | 'local' | 'cloud' | 'custom'>('all');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
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
          latencyMs: res.latencyMs,
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

  const filteredPresets = useMemo(() => {
    if (providerTab === 'all') return AI_PROVIDER_PRESETS;
    return AI_PROVIDER_PRESETS.filter((p) => p.category === providerTab);
  }, [providerTab]);

  const showWebGPU = providerTab === 'all' || providerTab === 'local';

  const filteredDiscoveredModels = useMemo(() => {
    if (!testResult?.models) return [];
    if (!modelSearchQuery.trim()) return testResult.models;
    const q = modelSearchQuery.toLowerCase();
    return testResult.models.filter((m) => m.toLowerCase().includes(q));
  }, [testResult?.models, modelSearchQuery]);

  const temperatureDescription = useMemo(() => {
    const temp = settings.aiTemperature ?? 0.2;
    if (temp <= 0.2) {
      return 'Precise & Deterministic: Recommended for programming, code refactoring, SQL queries, and exact facts.';
    }
    if (temp <= 0.7) {
      return 'Balanced: Optimal for everyday browsing, deep web research, and reasoning.';
    }
    return 'Creative & Exploratory: High diversity, ideal for brainstorming and imaginative drafting.';
  }, [settings.aiTemperature]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Features</h2>

        {/* Card 1: AI Assistant Infrastructure & Provider Selection */}
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/50 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/50 mb-6 overflow-hidden">
          {/* Header Title */}
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  AI Assistant Infrastructure & Providers
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Connect Nova AI to private on-device WebGPU models, local daemons (Ollama, LM Studio), or high-throughput cloud endpoints.
                </div>
              </div>
            </div>

            {/* Hero Active Status Banner */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/80 dark:to-blue-950/20 border border-slate-200/90 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start md:items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  {settings.aiProvider === 'webgpu' ? (
                    <Cpu className="w-5 h-5 text-emerald-500" />
                  ) : selectedPresetDef.id === 'openrouter' ? (
                    <Globe className="w-5 h-5 text-indigo-500" />
                  ) : selectedPresetDef.id === 'groq' ? (
                    <Zap className="w-5 h-5 text-amber-500" />
                  ) : selectedPresetDef.id === 'deepseek' ? (
                    <Code className="w-5 h-5 text-blue-500" />
                  ) : selectedPresetDef.id === 'openai' ? (
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Server className="w-5 h-5 text-blue-500" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {settings.aiProvider === 'webgpu' ? 'On-Device WebGPU' : selectedPresetDef.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {settings.aiProvider === 'webgpu'
                        ? '100% Private & Ready'
                        : testResult?.latencyMs
                        ? `${testResult.latencyMs}ms Connected`
                        : 'Active Backend'}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {settings.aiProvider === 'webgpu' ? 'Offline GPU' : selectedPresetDef.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                    <span className="text-slate-400 dark:text-slate-500 font-sans">Active Model:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {settings.aiProvider === 'webgpu'
                        ? aiAgent.getModelDisplayName()
                        : (settings.aiCustomModel || selectedPresetDef.defaultModel || 'Server Default')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {settings.aiProvider === 'webgpu'
                      ? 'Local memory buffer with zero data leaving this device.'
                      : `Endpoint: ${settings.aiCustomEndpoint || selectedPresetDef.defaultEndpoint}`}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {settings.aiProvider === 'custom' && (
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing Ping...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      Test Connection
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 mt-5 pb-1 flex-wrap">
              {[
                { id: 'all', label: 'All Providers', count: 10 },
                { id: 'local', label: 'Local & On-Device', count: 5 },
                { id: 'cloud', label: 'Cloud Services', count: 4 },
                { id: 'custom', label: 'Custom Endpoint', count: 1 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProviderTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    providerTab === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    providerTab === tab.id
                      ? 'bg-blue-500/40 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
              {/* WebGPU Tile */}
              {showWebGPU && (
                <button
                  type="button"
                  onClick={() => handleSelectPreset('webgpu')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                    (settings.aiProvider ?? 'webgpu') === 'webgpu'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      On-Device
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-semibold leading-snug">WebGPU</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      Zero data leakage, fully offline private execution.
                    </div>
                  </div>
                </button>
              )}

              {/* Filtered Dynamic Presets */}
              {filteredPresets.map((preset) => {
                const isSelected = settings.aiProvider === 'custom' && currentPresetId === preset.id;
                let IconComponent = Server;
                let iconColor = 'text-blue-500 bg-blue-500/10';
                if (preset.id === 'openrouter') {
                  IconComponent = Globe;
                  iconColor = 'text-indigo-500 bg-indigo-500/10';
                } else if (preset.id === 'groq') {
                  IconComponent = Zap;
                  iconColor = 'text-amber-500 bg-amber-500/10';
                } else if (preset.id === 'openai') {
                  IconComponent = Sparkles;
                  iconColor = 'text-purple-500 bg-purple-500/10';
                } else if (preset.id === 'deepseek') {
                  IconComponent = Code;
                  iconColor = 'text-sky-500 bg-sky-500/10';
                } else if (preset.id === 'custom') {
                  IconComponent = Sliders;
                  iconColor = 'text-slate-500 bg-slate-500/10';
                } else if (preset.id === 'lmstudio') {
                  IconComponent = Cpu;
                  iconColor = 'text-emerald-500 bg-emerald-500/10';
                }

                const categoryBadge = preset.category === 'local' ? 'Local' : preset.category === 'cloud' ? 'Cloud' : 'Custom';

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2 rounded-lg ${iconColor}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                        preset.category === 'local'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : preset.category === 'cloud'
                          ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {categoryBadge}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-semibold leading-snug">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-2">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Preset Configuration Details Panel */}
          <SmoothCollapse isOpen={settings.aiProvider === 'custom'}>
            <div className="p-5 bg-slate-50/60 dark:bg-slate-900/60 space-y-4 border-t border-slate-200/60 dark:border-slate-700/60">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    {selectedPresetDef.name} Parameters
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
                  {settings.aiCustomEndpoint && settings.aiCustomEndpoint !== selectedPresetDef.defaultEndpoint && (
                    <button
                      type="button"
                      onClick={() => handleCustomConfigChange('aiCustomEndpoint', selectedPresetDef.defaultEndpoint)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
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
                  className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Route requests to any standard OpenAI proxy or server. Suffix <code className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded">/v1</code> is automatically normalized.
                </p>
              </div>

              {/* Model Identifier & API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    value={settings.aiCustomModel ?? ''}
                    onChange={(e) => handleCustomConfigChange('aiCustomModel', e.target.value)}
                    placeholder={selectedPresetDef.defaultModel || 'e.g. llama3.3, claude-3-5-sonnet, gpt-4o'}
                    className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />

                  {/* Popular Models */}
                  {selectedPresetDef.popularModels && selectedPresetDef.popularModels.length > 0 && (
                    <div className="mt-2.5">
                      <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">
                        Quick select popular models:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPresetDef.popularModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleCustomConfigChange('aiCustomModel', m)}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              settings.aiCustomModel === m
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      API Key {selectedPresetDef.requiresApiKey ? '(Required)' : '(Optional)'}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {selectedPresetDef.requiresApiKey ? 'Bearer authorization' : 'Not needed for local'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.aiCustomApiKey ?? ''}
                      onChange={(e) => handleCustomConfigChange('aiCustomApiKey', e.target.value)}
                      placeholder={selectedPresetDef.apiKeyPlaceholder || 'Bearer token (if required)'}
                      className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs pl-8 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-2.5 transition-colors cursor-pointer"
                      title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    Stored encrypted on this device. Sent directly over TLS to your server.
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
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
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

                  <SmoothCollapse isOpen={Boolean(testResult)} className="inline-grid">
                    {testResult && (
                      <div className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                        testResult.ok
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span className="font-medium">{testResult.message}</span>
                      </div>
                    )}
                  </SmoothCollapse>
                </div>

                {/* Discovered Models Cloud */}
                <SmoothCollapse isOpen={Boolean(testResult?.models && testResult.models.length > 0)}>
                  {testResult?.models && testResult.models.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          Discovered Server Models ({testResult.models.length})
                        </div>
                        {testResult.models.length > 8 && (
                          <div className="relative w-48">
                            <input
                              type="text"
                              value={modelSearchQuery}
                              onChange={(e) => setModelSearchQuery(e.target.value)}
                              placeholder="Filter models..."
                              className="w-full bg-slate-50 dark:bg-slate-900 text-xs pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Click any discovered model to immediately set it as active:
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                        {filteredDiscoveredModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleCustomConfigChange('aiCustomModel', m)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              settings.aiCustomModel === m
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                                : 'bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </SmoothCollapse>
              </div>
            </div>
          </SmoothCollapse>
        </div>

        {/* Card 2: Model Behavior, Creativity & Intelligence Style (Independent Card) */}
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/50 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/50 mb-8 overflow-hidden">
          <div className="p-5 pb-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              Model Behavior & Intelligence Style
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fine-tune inference randomness, creativity thresholds, and conversational persona for your browsing sessions.
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    Inference Temperature
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Controls output predictability and exploratory creativity.
                  </p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900">
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
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(0.1)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                    (settings.aiTemperature ?? 0.2) <= 0.2
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Precise (0.10)
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(0.5)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                    (settings.aiTemperature ?? 0.2) > 0.2 && (settings.aiTemperature ?? 0.2) <= 0.7
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Balanced (0.50)
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(0.85)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${
                    (settings.aiTemperature ?? 0.2) > 0.7
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Creative (0.85)
                </button>
              </div>

              {/* Dynamic Context Helper Note */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {temperatureDescription}
              </div>
            </div>

            {/* Right Column: Assistant Persona */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Assistant Persona & Tone
                </label>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Defines the system instructions, depth, and communicative demeanor.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'balanced',
                    label: 'Balanced',
                    role: 'General Assistant',
                    desc: 'Clear reasoning, helpful explanations, and balanced tone.',
                    Icon: Sparkles,
                    color: 'text-blue-500'
                  },
                  {
                    id: 'code',
                    label: 'Code & Dev',
                    role: 'Staff Engineer',
                    desc: 'Clean unified diffs, terminal snippets, zero filler words.',
                    Icon: Code,
                    color: 'text-indigo-500'
                  },
                  {
                    id: 'concise',
                    label: 'Concise',
                    role: 'Minimalist',
                    desc: 'Direct bullet points, ultra-fast token conservation.',
                    Icon: Zap,
                    color: 'text-amber-500'
                  },
                  {
                    id: 'creative',
                    label: 'Creative',
                    role: 'Brainstormer',
                    desc: 'Vivid prose, expansive insights, and witty analogies.',
                    Icon: Globe,
                    color: 'text-purple-500'
                  }
                ].map((p) => {
                  const isSelected = (settings.aiSystemPersonality ?? 'balanced') === p.id;
                  const Icon = p.Icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonalityChange(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                          <span className="text-xs font-semibold">{p.label}</span>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div className="mt-1.5">
                        <div className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wide">
                          {p.role}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                          {p.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Additional AI & Privacy Controls */}
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8 overflow-hidden">
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

          <SmoothCollapse isOpen={Boolean(settings.tabHibernationEnabled ?? true)}>
            <div className="p-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hibernation Inactivity Timeout</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time after which unused tabs are suspended to save RAM</div>
              </div>
              <select
                value={settings.hibernationTimeoutMinutes ?? 10}
                onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
                className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none cursor-pointer"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </SmoothCollapse>

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

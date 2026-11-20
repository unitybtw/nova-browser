import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Key,
  Link2,
  Loader2,
  Lock,
  MessageSquare,
  RotateCcw,
  Search,
  Server,
  Sliders,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import {
  testOpenAIConnection,
  AI_PROVIDER_PRESETS,
  getProviderPreset,
  type AIProviderPreset,
} from '../../services/openAiCompatibleClient';
import { aiAgent } from '../../services/aiAgent';
import { getCachedCustomAiApiKey, loadCustomAiApiKey, saveCustomAiApiKey } from '../../services/aiSecretStore';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

export interface AISectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  /** Navigates to the MCP Server settings page. */
  onOpenMcp?: () => void;
}

type Persona = 'balanced' | 'creative' | 'code' | 'concise';
type ProviderFilter = 'all' | 'local' | 'cloud' | 'custom';

interface TestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  models?: string[];
}

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  webgpu: Cpu,
  ollama: Server,
  litellm: Server,
  lmstudio: HardDrive,
  vllm: Server,
  openrouter: Globe,
  groq: Zap,
  openai: MessageSquare,
  deepseek: Code,
  custom: Sliders,
};

const getProviderIcon = (id: string): LucideIcon => PROVIDER_ICONS[id] ?? Sliders;

const PERSONAS: { id: Persona; label: string; desc: string; Icon: LucideIcon }[] = [
  { id: 'balanced', label: 'Balanced', desc: 'Clear reasoning and helpful explanations.', Icon: MessageSquare },
  { id: 'concise', label: 'Concise', desc: 'Short, direct answers with no filler.', Icon: Zap },
  { id: 'code', label: 'Developer', desc: 'Precise code, diffs and terminal snippets.', Icon: Code },
  { id: 'creative', label: 'Creative', desc: 'Expansive ideas, vivid and exploratory prose.', Icon: Globe },
];

const CREATIVITY_STOPS = [
  { value: 0.1, label: 'Precise' },
  { value: 0.5, label: 'Balanced' },
  { value: 0.85, label: 'Creative' },
];

const safeHost = (url?: string) => {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const isLoopbackHost = (host: string) =>
  /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(host);

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode; hint?: React.ReactNode }> = ({
  htmlFor,
  children,
  hint,
}) => (
  <div className="flex items-center justify-between mb-1.5 gap-3">
    <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
      {children}
    </label>
    {hint}
  </div>
);

export const AISection: React.FC<AISectionProps> = ({ settings, onUpdateSettings, onOpenMcp }) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [customApiKeyInput, setCustomApiKeyInput] = useState<string>(() => getCachedCustomAiApiKey());
  const hasEditedApiKeyRef = useRef(false);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCustomAiApiKey().then((loaded) => {
      if (!cancelled && !hasEditedApiKeyRef.current) {
        setCustomApiKeyInput(loaded);
      }
    });
    return () => {
      cancelled = true;
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    };
  }, []);

  const isWebGPU = (settings.aiProvider ?? 'webgpu') === 'webgpu';
  const presetId = settings.aiProviderPreset || 'ollama';
  const preset = getProviderPreset(presetId);
  const activeId = isWebGPU ? 'webgpu' : preset.id;
  const temperature = settings.aiTemperature ?? 0.2;
  const persona: Persona = (settings.aiSystemPersonality as Persona) ?? 'balanced';
  const endpoint = settings.aiCustomEndpoint || preset.defaultEndpoint;
  const activeModel = isWebGPU
    ? aiAgent.getModelDisplayName()
    : settings.aiCustomModel || preset.defaultModel || 'Server default';
  const needsKey = !isWebGPU && preset.requiresApiKey && !customApiKeyInput.trim();

  const syncBackend = (overrides: {
    provider?: 'webgpu' | 'custom';
    endpoint?: string;
    model?: string;
    apiKey?: string;
    preset?: string;
    temperature?: number;
    persona?: Persona;
  }) => {
    aiAgent.configureBackend(
      overrides.provider ?? settings.aiProvider ?? 'webgpu',
      overrides.endpoint ?? settings.aiCustomEndpoint,
      overrides.model ?? settings.aiCustomModel,
      overrides.apiKey ?? customApiKeyInput,
      overrides.preset ?? settings.aiProviderPreset ?? 'ollama',
      overrides.temperature ?? temperature,
      overrides.persona ?? persona
    );
  };

  const handleSelectProvider = (id: string) => {
    setTestResult(null);
    setModelSearchQuery('');
    if (id === 'webgpu') {
      onUpdateSettings({ aiProvider: 'webgpu' });
      syncBackend({ provider: 'webgpu', preset: 'ollama' });
      return;
    }
    const next = getProviderPreset(id);
    const model = next.defaultModel || settings.aiCustomModel || '';
    onUpdateSettings({
      aiProvider: 'custom',
      aiProviderPreset: id as any,
      aiCustomEndpoint: next.defaultEndpoint,
      aiCustomModel: model,
    });
    syncBackend({ provider: 'custom', endpoint: next.defaultEndpoint, model, preset: id });
  };

  const handleFieldChange = (field: 'aiCustomEndpoint' | 'aiCustomModel' | 'aiCustomApiKey', val: string) => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    if (field === 'aiCustomApiKey') {
      hasEditedApiKeyRef.current = true;
      setCustomApiKeyInput(val);
      syncDebounceRef.current = setTimeout(() => {
        void saveCustomAiApiKey(val);
        syncBackend({ apiKey: val });
      }, 300);
      return;
    }
    onUpdateSettings({ [field]: val });
    syncDebounceRef.current = setTimeout(() => {
      syncBackend({
        endpoint: field === 'aiCustomEndpoint' ? val : undefined,
        model: field === 'aiCustomModel' ? val : undefined,
      });
    }, 300);
  };

  const handleTemperature = (val: number) => {
    const clamped = Math.min(1, Math.max(0, Math.round(val * 100) / 100));
    onUpdateSettings({ aiTemperature: clamped });
    syncBackend({ temperature: clamped });
  };

  const handlePersona = (val: Persona) => {
    onUpdateSettings({ aiSystemPersonality: val });
    syncBackend({ persona: val });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testOpenAIConnection(endpoint, customApiKeyInput, settings.aiCustomModel);
      if (res.ok) {
        const count = res.models?.length ?? 0;
        setTestResult({
          ok: true,
          message: count > 0 ? `Connected in ${res.latencyMs}ms. ${count} models available.` : `Connected in ${res.latencyMs}ms.`,
          latencyMs: res.latencyMs,
          models: res.models,
        });
      } else {
        setTestResult({ ok: false, message: res.error || 'Connection failed' });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const filterCounts = useMemo(() => {
    const local = AI_PROVIDER_PRESETS.filter((p) => p.category === 'local').length + 1;
    const cloud = AI_PROVIDER_PRESETS.filter((p) => p.category === 'cloud').length;
    const custom = AI_PROVIDER_PRESETS.filter((p) => p.category === 'custom').length;
    return { all: local + cloud + custom, local, cloud, custom };
  }, []);

  const visiblePresets = useMemo(
    () => (providerFilter === 'all' ? AI_PROVIDER_PRESETS : AI_PROVIDER_PRESETS.filter((p) => p.category === providerFilter)),
    [providerFilter]
  );
  const showWebGPUOption = providerFilter === 'all' || providerFilter === 'local';

  const discoveredModels = useMemo(() => {
    const models = testResult?.models ?? [];
    const q = modelSearchQuery.trim().toLowerCase();
    return q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
  }, [testResult?.models, modelSearchQuery]);

  const privacy = useMemo(() => {
    if (isWebGPU) {
      return {
        label: 'On-device',
        detail: 'Prompts and page content never leave this computer.',
        Icon: Lock,
        tone: 'emerald' as const,
      };
    }
    const host = safeHost(endpoint);
    if (isLoopbackHost(host)) {
      return {
        label: 'Local server',
        detail: `Requests stay on this machine (${host}).`,
        Icon: HardDrive,
        tone: 'emerald' as const,
      };
    }
    if (preset.category === 'cloud') {
      return {
        label: 'Cloud',
        detail: `Prompts and page context are sent to ${preset.name} (${host}).`,
        Icon: Cloud,
        tone: 'amber' as const,
      };
    }
    return {
      label: 'Remote endpoint',
      detail: `Requests are sent to ${host || 'your custom server'}.`,
      Icon: Globe,
      tone: 'amber' as const,
    };
  }, [isWebGPU, endpoint, preset]);

  const status = useMemo(() => {
    if (isWebGPU) return { label: 'Ready', tone: 'ok' as const };
    if (testingConnection) return { label: 'Checking', tone: 'pending' as const };
    if (needsKey) return { label: 'API key required', tone: 'warn' as const };
    if (testResult?.ok) return { label: `Connected · ${testResult.latencyMs}ms`, tone: 'ok' as const };
    if (testResult && !testResult.ok) return { label: 'Unreachable', tone: 'error' as const };
    return { label: 'Not verified', tone: 'idle' as const };
  }, [isWebGPU, testingConnection, needsKey, testResult]);

  const statusDot = {
    ok: 'bg-emerald-500',
    pending: 'bg-neutral-500 animate-pulse',
    warn: 'bg-amber-500',
    error: 'bg-red-500',
    idle: 'bg-neutral-400 dark:bg-neutral-600',
  }[status.tone];

  const ActiveIcon = getProviderIcon(activeId);
  const PrivacyIcon = privacy.Icon;
  const personaLabel = PERSONAS.find((p) => p.id === persona)?.label ?? 'Balanced';
  const creativityLabel = temperature <= 0.2 ? 'Precise' : temperature <= 0.7 ? 'Balanced' : 'Creative';
  const creativityHint =
    temperature <= 0.2
      ? 'Deterministic output. Best for code, data extraction and factual answers.'
      : temperature <= 0.7
      ? 'A good default for browsing, research and summaries.'
      : 'More varied output. Best for brainstorming and drafting.';

  const renderProviderOption = (
    id: string,
    name: string,
    description: string,
    category: AIProviderPreset['category'] | 'device'
  ) => {
    const selected = activeId === id;
    const Icon = getProviderIcon(id);
    const badge =
      category === 'device' ? 'On-device' : category === 'local' ? 'Local' : category === 'cloud' ? 'Cloud' : 'Custom';
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => handleSelectProvider(id)}
        className={`group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/30 ${
          selected
            ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-white/[0.06]'
            : 'border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
            selected
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent'
              : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 border-neutral-200/70 dark:border-white/[0.08]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{name}</span>
            <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 dark:text-neutral-500">
              {badge}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
        <span
          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-950'
              : 'border-neutral-300 dark:border-white/20'
          }`}
        >
          {selected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Nova AI"
        description="Choose where the assistant runs, how it responds, and which AI features are active while you browse."
      />

      {/* Active Engine Summary */}
      <SettingsGroup>
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0 text-neutral-700 dark:text-neutral-200">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-neutral-950 dark:text-neutral-100">
                  {isWebGPU ? 'On-device (WebGPU)' : preset.name}
                </span>
                <SettingsBadge>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  {status.label}
                </SettingsBadge>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5 truncate" title={activeModel}>
                {activeModel}
              </div>
            </div>
          </div>

          {!isWebGPU && (
            <SettingsButton
              variant="secondary"
              disabled={testingConnection}
              onClick={handleTestConnection}
              className="self-start sm:self-auto shrink-0"
            >
              {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {testingConnection ? 'Testing' : 'Test connection'}
            </SettingsButton>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-neutral-200/80 dark:divide-white/[0.07]">
          {[
            { k: 'Data', v: privacy.label, Icon: PrivacyIcon },
            { k: 'Style', v: personaLabel, Icon: MessageSquare },
            { k: 'Creativity', v: `${creativityLabel} · ${temperature.toFixed(2)}`, Icon: Sliders },
          ].map(({ k, v, Icon }) => (
            <div key={k} className="px-4 sm:px-5 py-2.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 dark:text-neutral-500">
                {k}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <span className="truncate">{v}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsGroup>

      {/* Model Provider */}
      <SettingsGroup
        title="Model Provider"
        description="Run models privately on this device, on your own server, or through a cloud API."
        right={
          <div
            role="tablist"
            aria-label="Filter providers"
            className="hidden sm:inline-flex p-0.5 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.07]"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'local', label: 'Local' },
                { id: 'cloud', label: 'Cloud' },
                { id: 'custom', label: 'Custom' },
              ] as { id: ProviderFilter; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={providerFilter === f.id}
                onClick={() => setProviderFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  providerFilter === f.id
                    ? 'bg-white dark:bg-white/[0.14] text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {f.label}
                <span className="ml-1 text-neutral-400 dark:text-neutral-500 tabular-nums">{filterCounts[f.id]}</span>
              </button>
            ))}
          </div>
        }
      >
        <div role="radiogroup" aria-label="AI provider" className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2">
          {showWebGPUOption &&
            renderProviderOption('webgpu', 'WebGPU', 'Fully offline inference on your GPU. Nothing leaves this device.', 'device')}
          {visiblePresets.map((p) => renderProviderOption(p.id, p.name, p.description, p.category))}
        </div>

        <div
          className={`flex items-start gap-2.5 px-4 sm:px-5 py-3 text-xs leading-relaxed ${
            privacy.tone === 'emerald'
              ? 'bg-emerald-500/[0.06] text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-500/[0.06] text-amber-800 dark:text-amber-300'
          }`}
        >
          <PrivacyIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">{privacy.label}.</span> {privacy.detail}
          </span>
        </div>
      </SettingsGroup>

      {/* Connection */}
      <SmoothCollapse isOpen={!isWebGPU}>
        <SettingsGroup
          title="Connection"
          description={`Configure how Nova reaches ${preset.name}. Any OpenAI-compatible server is supported.`}
          right={
            preset.docsUrl ? (
              <a
                href={preset.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors shrink-0"
              >
                Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : undefined
          }
        >
          {/* Base URL */}
          <div className="px-4 sm:px-5 py-3.5">
            <FieldLabel
              htmlFor="ai-endpoint"
              hint={
                settings.aiCustomEndpoint && settings.aiCustomEndpoint !== preset.defaultEndpoint ? (
                  <button
                    type="button"
                    onClick={() => handleFieldChange('aiCustomEndpoint', preset.defaultEndpoint)}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                ) : (
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">/v1 is added automatically</span>
                )
              }
            >
              Base URL
            </FieldLabel>
            <input
              id="ai-endpoint"
              type="text"
              spellCheck={false}
              autoComplete="off"
              value={settings.aiCustomEndpoint ?? preset.defaultEndpoint}
              onChange={(e) => handleFieldChange('aiCustomEndpoint', e.target.value)}
              placeholder={preset.defaultEndpoint}
              className={`${SETTINGS_INPUT_CLS} font-mono`}
            />
          </div>

          {/* API Key */}
          <div className="px-4 sm:px-5 py-3.5">
            <FieldLabel
              htmlFor="ai-api-key"
              hint={
                <span className={`text-[11px] ${needsKey ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
                  {preset.requiresApiKey ? 'Required' : 'Optional'}
                </span>
              }
            >
              API key
            </FieldLabel>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="ai-api-key"
                type={showApiKey ? 'text' : 'password'}
                spellCheck={false}
                autoComplete="off"
                value={customApiKeyInput}
                onChange={(e) => handleFieldChange('aiCustomApiKey', e.target.value)}
                placeholder={preset.apiKeyPlaceholder || (preset.requiresApiKey ? 'Paste your API key' : 'Not needed for most local servers')}
                className={`${SETTINGS_INPUT_CLS} font-mono pl-8 pr-9 ${needsKey ? 'border-amber-400/70 dark:border-amber-500/40' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Encrypted on this device and sent only to the endpoint above.
            </p>
          </div>

          {/* Model */}
          <div className="px-4 sm:px-5 py-3.5">
            <FieldLabel htmlFor="ai-model">Model</FieldLabel>
            <input
              id="ai-model"
              type="text"
              spellCheck={false}
              autoComplete="off"
              value={settings.aiCustomModel ?? ''}
              onChange={(e) => handleFieldChange('aiCustomModel', e.target.value)}
              placeholder={preset.defaultModel || 'e.g. llama3.3, gpt-4o'}
              className={`${SETTINGS_INPUT_CLS} font-mono`}
            />

            {preset.popularModels?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 dark:text-neutral-500 mb-1.5">
                  Suggested
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preset.popularModels.map((m) => {
                    const on = settings.aiCustomModel === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleFieldChange('aiCustomModel', m)}
                        className={`text-[11px] font-mono px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                          on
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent'
                            : 'bg-neutral-50 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-400 dark:hover:border-white/25'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <SmoothCollapse isOpen={Boolean(testResult?.models?.length)}>
              <div className="mt-3.5 rounded-lg border border-neutral-200/90 dark:border-white/[0.08] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-neutral-50 dark:bg-white/[0.03] border-b border-neutral-200/80 dark:border-white/[0.07]">
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    Available on server
                    <span className="ml-1.5 text-neutral-400 tabular-nums">{testResult?.models?.length ?? 0}</span>
                  </span>
                  <div className="relative w-44">
                    <Search className="w-3 h-3 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Filter"
                      aria-label="Filter models"
                      className="w-full bg-white dark:bg-[#141518] text-[11px] pl-6 pr-2 py-1 rounded-md border border-neutral-200/90 dark:border-white/[0.09] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30 font-mono"
                    />
                  </div>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-neutral-200/70 dark:divide-white/[0.06]">
                  {discoveredModels.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-neutral-400">No models match.</div>
                  ) : (
                    discoveredModels.map((m) => {
                      const on = settings.aiCustomModel === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleFieldChange('aiCustomModel', m)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] font-mono transition-colors cursor-pointer ${
                            on
                              ? 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-950 dark:text-white font-medium'
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="truncate">{m}</span>
                          {on && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </SmoothCollapse>
          </div>

          {/* Test connection footer */}
          <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 bg-neutral-50/70 dark:bg-white/[0.02]">
            <SettingsButton
              variant="primary"
              disabled={testingConnection}
              onClick={handleTestConnection}
            >
              {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {testingConnection ? 'Testing connection' : 'Test connection'}
            </SettingsButton>
            <SmoothCollapse isOpen={Boolean(testResult)} className="flex-1 min-w-[200px]">
              {testResult && (
                <div
                  role="status"
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    testResult.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span className="break-all">{testResult.message}</span>
                </div>
              )}
            </SmoothCollapse>
          </div>
        </SettingsGroup>
      </SmoothCollapse>

      {/* Response Style */}
      <SettingsGroup
        title="Response Style"
        description="Shape how the assistant writes and how much it improvises."
      >
        <div className="px-4 sm:px-5 py-3.5">
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-200 mb-2.5">Tone</div>
          <div role="radiogroup" aria-label="Assistant tone" className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {PERSONAS.map(({ id, label, desc, Icon }) => {
              const on = persona === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => handlePersona(id)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/30 ${
                    on
                      ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-white/[0.06]'
                      : 'border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      on ? 'text-neutral-950 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  />
                  <div className="mt-2 text-xs font-medium text-neutral-900 dark:text-neutral-100">{label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <label htmlFor="ai-creativity" className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Creativity
            </label>
            <SettingsBadge className="font-mono tabular-nums">
              {temperature.toFixed(2)}
            </SettingsBadge>
          </div>
          <input
            id="ai-creativity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={temperature}
            onChange={(e) => handleTemperature(parseFloat(e.target.value))}
            aria-valuetext={`${creativityLabel}, ${temperature.toFixed(2)}`}
            className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-white/15 appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
          />
          <div className="mt-2 flex items-center justify-between">
            {CREATIVITY_STOPS.map((s) => {
              const on = creativityLabel === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleTemperature(s.value)}
                  className={`text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    on
                      ? 'text-neutral-950 dark:text-white font-semibold'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{creativityHint}</p>
        </div>
      </SettingsGroup>

      {/* Features */}
      <SettingsGroup
        title="Features"
        description="AI capabilities built into the browsing experience."
      >
        <SettingsRow
          icon={<Link2 className="w-4 h-4" />}
          title="Link previews"
          description="Summarize a page when you hover over its link. Runs locally with WebLLM."
        >
          <ToggleSwitch
            ariaLabel="Toggle AI link previews"
            checked={settings.aiLinkPreviewEnabled}
            onToggle={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
          />
        </SettingsRow>

        <button
          type="button"
          onClick={onOpenMcp}
          disabled={!onOpenMcp}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/70 dark:hover:bg-white/[0.03] transition-colors cursor-pointer disabled:cursor-default"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 text-neutral-500 dark:text-neutral-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                Tools and MCP servers
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Connect external tools the assistant can call. Managed in the MCP Server page.
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0" />
        </button>
      </SettingsGroup>
    </div>
  );
};

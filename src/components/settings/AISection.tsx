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
  RotateCcw,
  Search,
  Server,
  Sliders,
  Sparkles,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import {
  testOpenAIConnection,
  AI_PROVIDER_PRESETS,
  getProviderPreset,
  type AIProviderPreset
} from '../../services/openAiCompatibleClient';
import { aiAgent } from '../../services/aiAgent';
import { getCachedCustomAiApiKey, loadCustomAiApiKey, saveCustomAiApiKey } from '../../services/aiSecretStore';

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

/* ------------------------------------------------------------------ */
/* Static metadata                                                     */
/* ------------------------------------------------------------------ */

const PROVIDER_ICONS: Record<string, { Icon: LucideIcon; tint: string }> = {
  webgpu: { Icon: Cpu, tint: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  ollama: { Icon: Server, tint: 'text-slate-700 dark:text-slate-200 bg-slate-500/10' },
  litellm: { Icon: Server, tint: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
  lmstudio: { Icon: HardDrive, tint: 'text-teal-600 dark:text-teal-400 bg-teal-500/10' },
  vllm: { Icon: Server, tint: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  openrouter: { Icon: Globe, tint: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
  groq: { Icon: Zap, tint: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  openai: { Icon: Sparkles, tint: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
  deepseek: { Icon: Code, tint: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  custom: { Icon: Sliders, tint: 'text-slate-600 dark:text-slate-300 bg-slate-500/10' }
};

const getProviderIcon = (id: string) => PROVIDER_ICONS[id] ?? PROVIDER_ICONS.custom;

const PERSONAS: { id: Persona; label: string; desc: string; Icon: LucideIcon }[] = [
  { id: 'balanced', label: 'Balanced', desc: 'Clear reasoning and helpful explanations.', Icon: Sparkles },
  { id: 'concise', label: 'Concise', desc: 'Short, direct answers with no filler.', Icon: Zap },
  { id: 'code', label: 'Developer', desc: 'Precise code, diffs and terminal snippets.', Icon: Code },
  { id: 'creative', label: 'Creative', desc: 'Expansive ideas, vivid and exploratory prose.', Icon: Globe }
];

const CREATIVITY_STOPS = [
  { value: 0.1, label: 'Precise' },
  { value: 0.5, label: 'Balanced' },
  { value: 0.85, label: 'Creative' }
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

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

const Group: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="space-y-3">
    <div className="flex items-end justify-between gap-4 px-0.5">
      <div>
        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
    <div className="premium-card bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
      {children}
    </div>
  </section>
);

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode; hint?: React.ReactNode }> = ({
  htmlFor,
  children,
  hint
}) => (
  <div className="flex items-center justify-between mb-1.5 gap-3">
    <label htmlFor={htmlFor} className="text-xs font-medium text-slate-700 dark:text-slate-200">
      {children}
    </label>
    {hint}
  </div>
);

const inputClass =
  'w-full bg-slate-50/70 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono';

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AISection: React.FC<AISectionProps> = ({ settings, onUpdateSettings, onOpenMcp }) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [customApiKeyInput, setCustomApiKeyInput] = useState<string>(() => getCachedCustomAiApiKey());
  const hasEditedApiKeyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadCustomAiApiKey().then((loaded) => {
      if (!cancelled && !hasEditedApiKeyRef.current) {
        setCustomApiKeyInput(loaded);
      }
    });
    return () => {
      cancelled = true;
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

  /* ----------------------------- backend sync ----------------------------- */

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
      aiCustomModel: model
    });
    syncBackend({ provider: 'custom', endpoint: next.defaultEndpoint, model, preset: id });
  };

  const handleFieldChange = (field: 'aiCustomEndpoint' | 'aiCustomModel' | 'aiCustomApiKey', val: string) => {
    if (field === 'aiCustomApiKey') {
      hasEditedApiKeyRef.current = true;
      setCustomApiKeyInput(val);
      void saveCustomAiApiKey(val);
      syncBackend({ apiKey: val });
      return;
    }
    onUpdateSettings({ [field]: val });
    syncBackend({
      endpoint: field === 'aiCustomEndpoint' ? val : undefined,
      model: field === 'aiCustomModel' ? val : undefined
    });
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
          models: res.models
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

  /* ------------------------------- derived ------------------------------- */

  const filterCounts = useMemo(() => {
    const local = AI_PROVIDER_PRESETS.filter((p) => p.category === 'local').length + 1; // + WebGPU
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
        tone: 'emerald' as const
      };
    }
    const host = safeHost(endpoint);
    if (isLoopbackHost(host)) {
      return {
        label: 'Local server',
        detail: `Requests stay on this machine (${host}).`,
        Icon: HardDrive,
        tone: 'emerald' as const
      };
    }
    if (preset.category === 'cloud') {
      return {
        label: 'Cloud',
        detail: `Prompts and page context are sent to ${preset.name} (${host}).`,
        Icon: Cloud,
        tone: 'amber' as const
      };
    }
    return {
      label: 'Remote endpoint',
      detail: `Requests are sent to ${host || 'your custom server'}.`,
      Icon: Globe,
      tone: 'amber' as const
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
    pending: 'bg-blue-500 animate-pulse',
    warn: 'bg-amber-500',
    error: 'bg-rose-500',
    idle: 'bg-slate-400'
  }[status.tone];

  const activeIcon = getProviderIcon(activeId);
  const ActiveIcon = activeIcon.Icon;
  const PrivacyIcon = privacy.Icon;
  const personaLabel = PERSONAS.find((p) => p.id === persona)?.label ?? 'Balanced';
  const creativityLabel = temperature <= 0.2 ? 'Precise' : temperature <= 0.7 ? 'Balanced' : 'Creative';
  const creativityHint =
    temperature <= 0.2
      ? 'Deterministic output. Best for code, data extraction and factual answers.'
      : temperature <= 0.7
      ? 'A good default for browsing, research and summaries.'
      : 'More varied output. Best for brainstorming and drafting.';

  /* -------------------------------- render ------------------------------- */

  const renderProviderOption = (
    id: string,
    name: string,
    description: string,
    category: AIProviderPreset['category'] | 'device'
  ) => {
    const selected = activeId === id;
    const { Icon, tint } = getProviderIcon(id);
    const badge =
      category === 'device' ? 'On-device' : category === 'local' ? 'Local' : category === 'cloud' ? 'Cloud' : 'Custom';
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => handleSelectProvider(id)}
        className={`group relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          selected
            ? 'border-blue-500/70 bg-blue-50/60 dark:bg-blue-500/[0.08] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
            : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</span>
            <span className="text-[9.5px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">
              {badge}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">{description}</p>
        </div>
        <span
          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
            selected ? 'bg-blue-600 border-blue-600 scale-100' : 'border-slate-300 dark:border-slate-600 scale-95'
          }`}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </span>
      </button>
    );
  };

  const tempPercent = Math.round(temperature * 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ========================== Page header ========================== */}
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Nova AI</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Choose where the assistant runs, how it responds, and which AI features are active while you browse.
        </p>
      </header>

      {/* ========================== Overview card ========================= */}
      <div className="premium-card relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/40">
        <div className="relative p-5 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${activeIcon.tint}`}>
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {isWebGPU ? 'On-device (WebGPU)' : preset.name}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  {status.label}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 truncate" title={activeModel}>
                {activeModel}
              </div>
            </div>
          </div>

          {!isWebGPU && (
            <button
              type="button"
              disabled={testingConnection}
              onClick={handleTestConnection}
              className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default shrink-0"
            >
              {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {testingConnection ? 'Testing' : 'Test connection'}
            </button>
          )}
        </div>

        <div className="relative grid grid-cols-3 border-t border-slate-100 dark:border-slate-700/50 divide-x divide-slate-100 dark:divide-slate-700/50">
          {[
            { k: 'Data', v: privacy.label, Icon: PrivacyIcon, accent: privacy.tone === 'emerald' ? 'text-emerald-500' : 'text-amber-500' },
            { k: 'Style', v: personaLabel, Icon: Sparkles, accent: 'text-blue-500' },
            { k: 'Creativity', v: `${creativityLabel} · ${temperature.toFixed(2)}`, Icon: Sliders, accent: 'text-blue-500' }
          ].map(({ k, v, Icon, accent }) => (
            <div key={k} className="px-5 py-3 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">{k}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${accent}`} />
                <span className="truncate">{v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================ Engine ============================== */}
      <Group
        title="Model provider"
        description="Run models privately on this device, on your own server, or through a cloud API."
        action={
          <div
            role="tablist"
            aria-label="Filter providers"
            className="hidden sm:inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'local', label: 'Local' },
                { id: 'cloud', label: 'Cloud' },
                { id: 'custom', label: 'Custom' }
              ] as { id: ProviderFilter; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={providerFilter === f.id}
                onClick={() => setProviderFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  providerFilter === f.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
                <span className="ml-1 text-slate-400 dark:text-slate-500 tabular-nums">{filterCounts[f.id]}</span>
              </button>
            ))}
          </div>
        }
      >
        <div role="radiogroup" aria-label="AI provider" className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {showWebGPUOption &&
            renderProviderOption('webgpu', 'WebGPU', 'Fully offline inference on your GPU. Nothing leaves this device.', 'device')}
          {visiblePresets.map((p) => renderProviderOption(p.id, p.name, p.description, p.category))}
        </div>

        {/* Data flow notice */}
        <div
          className={`flex items-start gap-2.5 px-4 py-3 border-t text-[11.5px] leading-relaxed ${
            privacy.tone === 'emerald'
              ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-500/[0.05] text-emerald-800 dark:text-emerald-300'
              : 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-500/[0.05] text-amber-800 dark:text-amber-300'
          }`}
        >
          <PrivacyIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">{privacy.label}.</span> {privacy.detail}
          </span>
        </div>
      </Group>

      {/* ========================== Connection ============================ */}
      <SmoothCollapse isOpen={!isWebGPU}>
        <Group
          title="Connection"
          description={`Configure how Nova reaches ${preset.name}. Any OpenAI-compatible server is supported.`}
          action={
            preset.docsUrl ? (
              <a
                href={preset.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : undefined
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {/* Endpoint */}
            <div className="p-4">
              <FieldLabel
                htmlFor="ai-endpoint"
                hint={
                  settings.aiCustomEndpoint && settings.aiCustomEndpoint !== preset.defaultEndpoint ? (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('aiCustomEndpoint', preset.defaultEndpoint)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">/v1 is added automatically</span>
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
                className={inputClass}
              />
            </div>

            {/* API key */}
            <div className="p-4">
              <FieldLabel
                htmlFor="ai-api-key"
                hint={
                  <span className={`text-[11px] ${needsKey ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400'}`}>
                    {preset.requiresApiKey ? 'Required' : 'Optional'}
                  </span>
                }
              >
                API key
              </FieldLabel>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="ai-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  spellCheck={false}
                  autoComplete="off"
                  value={customApiKeyInput}
                  onChange={(e) => handleFieldChange('aiCustomApiKey', e.target.value)}
                  placeholder={preset.apiKeyPlaceholder || (preset.requiresApiKey ? 'Paste your API key' : 'Not needed for most local servers')}
                  className={`${inputClass} pl-8 pr-10 ${needsKey ? 'border-amber-300 dark:border-amber-700/70' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                Encrypted on this device and sent only to the endpoint above.
              </p>
            </div>

            {/* Model */}
            <div className="p-4">
              <FieldLabel htmlFor="ai-model">Model</FieldLabel>
              <input
                id="ai-model"
                type="text"
                spellCheck={false}
                autoComplete="off"
                value={settings.aiCustomModel ?? ''}
                onChange={(e) => handleFieldChange('aiCustomModel', e.target.value)}
                placeholder={preset.defaultModel || 'e.g. llama3.3, gpt-4o'}
                className={inputClass}
              />

              {preset.popularModels?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500 mb-1.5">
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
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                              : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Discovered models */}
              <SmoothCollapse isOpen={Boolean(testResult?.models?.length)}>
                <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Available on server
                      <span className="ml-1.5 text-slate-400 tabular-nums">{testResult?.models?.length ?? 0}</span>
                    </span>
                    <div className="relative w-44">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        placeholder="Filter"
                        aria-label="Filter models"
                        className="w-full bg-white dark:bg-slate-800 text-[11px] pl-6 pr-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {discoveredModels.length === 0 ? (
                      <div className="px-3 py-3 text-[11px] text-slate-400">No models match.</div>
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
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
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

            {/* Test row */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="button"
                disabled={testingConnection}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default shadow-sm"
              >
                {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {testingConnection ? 'Testing connection' : 'Test connection'}
              </button>
              <SmoothCollapse isOpen={Boolean(testResult)} className="flex-1 min-w-[200px]">
                {testResult && (
                  <div
                    role="status"
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      testResult.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span className="break-all">{testResult.message}</span>
                  </div>
                )}
              </SmoothCollapse>
            </div>
          </div>
        </Group>
      </SmoothCollapse>

      {/* =========================== Behavior ============================= */}
      <Group title="Response style" description="Shape how the assistant writes and how much it improvises.">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {/* Persona */}
          <div className="p-4">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2.5">Tone</div>
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
                    className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      on
                        ? 'border-blue-500/70 bg-blue-50/60 dark:bg-blue-500/[0.08] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                        : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${on ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">{label}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Creativity */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="ai-creativity" className="text-xs font-medium text-slate-700 dark:text-slate-200">
                Creativity
              </label>
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">
                {temperature.toFixed(2)}
              </span>
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
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
              style={{
                background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${tempPercent}%, rgba(148,163,184,0.35) ${tempPercent}%, rgba(148,163,184,0.35) 100%)`
              }}
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
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{creativityHint}</p>
          </div>
        </div>
      </Group>

      {/* =========================== Features ============================= */}
      <Group title="Features" description="AI capabilities built into the browsing experience.">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Link2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Link previews</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Summarize a page when you hover over its link. Runs locally with WebLLM.
                </div>
              </div>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle AI link previews"
              checked={settings.aiLinkPreviewEnabled}
              onToggle={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
              activeColorClass="bg-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={onOpenMcp}
            disabled={!onOpenMcp}
            className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer disabled:cursor-default"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-500/10 text-slate-600 dark:text-slate-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Tools and MCP servers</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Connect external tools the assistant can call. Managed in the MCP Server page.
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
          </button>
        </div>
      </Group>
    </div>
  );
};

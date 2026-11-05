/**
 * OpenAI-Compatible & Multi-Provider AI Client
 * Enterprise-grade connector for LiteLLM, Ollama, LM Studio, vLLM, OpenRouter, Groq,
 * DeepSeek, and OpenAI endpoints for Nova Browser's AI Assistant.
 */

export interface OpenAIModelSummary {
  id: string;
  name?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  models?: string[];
  latencyMs?: number;
  error?: string;
  providerName?: string;
}

export interface AIProviderPreset {
  id: string;
  name: string;
  category: 'local' | 'cloud' | 'custom';
  defaultEndpoint: string;
  defaultModel: string;
  popularModels: string[];
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  description: string;
  docsUrl?: string;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'local',
    defaultEndpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3',
    popularModels: ['llama3.3', 'deepseek-r1', 'qwen2.5-coder', 'mistral', 'llama3.2', 'phi4', 'gemma2'],
    requiresApiKey: false,
    description: 'Local private models running via Ollama daemon',
    docsUrl: 'https://ollama.com'
  },
  {
    id: 'litellm',
    name: 'LiteLLM Proxy',
    category: 'local',
    defaultEndpoint: 'http://localhost:4000/v1',
    defaultModel: '',
    popularModels: ['default', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
    requiresApiKey: false,
    description: 'Unified gateway proxy for 100+ local & team LLMs',
    docsUrl: 'https://docs.litellm.ai'
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    category: 'local',
    defaultEndpoint: 'http://localhost:1234/v1',
    defaultModel: '',
    popularModels: ['local-model'],
    requiresApiKey: false,
    description: 'Run GGUF models locally with LM Studio server',
    docsUrl: 'https://lmstudio.ai'
  },
  {
    id: 'vllm',
    name: 'vLLM',
    category: 'local',
    defaultEndpoint: 'http://localhost:8000/v1',
    defaultModel: '',
    popularModels: [],
    requiresApiKey: false,
    description: 'High-throughput local vLLM server',
    docsUrl: 'https://docs.vllm.ai'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'cloud',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    popularModels: [
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-r1',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-coder-32b-instruct'
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-or-v1-...',
    description: 'Access Claude, DeepSeek, GPT-4o, and 200+ models with one key',
    docsUrl: 'https://openrouter.ai'
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    category: 'cloud',
    defaultEndpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    popularModels: [
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'gsk_...',
    description: 'Ultra-fast LPU inference (500+ tokens/sec)',
    docsUrl: 'https://console.groq.com'
  },
  {
    id: 'openai',
    name: 'OpenAI Official',
    category: 'cloud',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    popularModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'gpt-4-turbo'],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-proj-...',
    description: 'Direct connection to OpenAI API platform',
    docsUrl: 'https://platform.openai.com'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Official',
    category: 'cloud',
    defaultEndpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    popularModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    description: 'Official API for DeepSeek V3 and R1 reasoning models',
    docsUrl: 'https://platform.deepseek.com'
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    category: 'custom',
    defaultEndpoint: 'http://localhost:4000/v1',
    defaultModel: '',
    popularModels: [],
    requiresApiKey: false,
    description: 'Any OpenAI-compatible HTTP server URL and credentials'
  }
];

export function getProviderPreset(id: string): AIProviderPreset {
  const found = AI_PROVIDER_PRESETS.find(p => p.id === id);
  return found || AI_PROVIDER_PRESETS[AI_PROVIDER_PRESETS.length - 1];
}

/**
 * Normalizes an OpenAI-compatible base URL.
 * Strips trailing slashes and ensures /v1 is appended if not present.
 */
export function normalizeOpenAIEndpoint(endpoint: string): string {
  let clean = (endpoint || '').trim().replace(/\/+$/, '');
  if (!clean) {
    clean = 'http://localhost:4000/v1';
  }
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  if (!clean.endsWith('/v1')) {
    clean = `${clean}/v1`;
  }
  return clean;
}

/**
 * Tests connectivity to an OpenAI-compatible endpoint.
 * Probes GET /models first, falling back to a 1-token POST /chat/completions.
 */
export async function testOpenAIConnection(
  endpoint: string,
  apiKey?: string,
  modelName?: string
): Promise<ConnectionTestResult> {
  const normalized = normalizeOpenAIEndpoint(endpoint);
  const startTime = Date.now();
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  // 1. Try GET /models
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const modelsRes = await fetch(`${normalized}/models`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (modelsRes.ok) {
      const data = await modelsRes.json();
      const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const models = rawList
        .map((m: any) => typeof m === 'string' ? m : m?.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
      return {
        ok: true,
        models,
        latencyMs: Date.now() - startTime
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out after 7 seconds' };
    }
  }

  // 2. Fallback: Try a 1-token POST /chat/completions
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const postRes = await fetch(`${normalized}/chat/completions`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName?.trim() || 'default',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (postRes.ok) {
      return {
        ok: true,
        latencyMs: Date.now() - startTime
      };
    }

    let errorDetail = `HTTP ${postRes.status} ${postRes.statusText}`;
    try {
      const errJson = await postRes.json();
      errorDetail = errJson?.error?.message || errJson?.message || errorDetail;
    } catch {}

    return { ok: false, error: errorDetail };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Could not connect to the endpoint. Please check if the server is running.'
    };
  }
}

/**
 * Drop-in OpenAI-compatible engine implementing the chat.completions.create
 * interface expected by AIAgent, with Server-Sent Events (SSE) streaming support.
 */
export class OpenAICompatibleEngine {
  public chat = {
    completions: {
      create: async (
        params: {
          messages: any[];
          temperature?: number;
          max_tokens?: number;
          stream?: boolean;
          response_format?: any;
          signal?: AbortSignal;
          onChunk?: (chunk: string) => void;
          [key: string]: any;
        },
        onChunk?: (chunk: string) => void
      ): Promise<any> => {
        const mergedParams = onChunk ? { ...params, onChunk } : params;
        return this._createCompletion(mergedParams);
      }
    }
  };

  private normalizedEndpoint: string;

  constructor(
    public endpoint: string,
    public modelName: string = '',
    public apiKey: string = ''
  ) {
    this.normalizedEndpoint = normalizeOpenAIEndpoint(endpoint);
  }

  public updateConfig(endpoint: string, modelName: string = '', apiKey: string = '') {
    this.endpoint = endpoint;
    this.normalizedEndpoint = normalizeOpenAIEndpoint(endpoint);
    this.modelName = modelName;
    this.apiKey = apiKey;
  }

  public async unload(): Promise<void> {
    // Stateless HTTP client; no heavy resources to unload
  }

  private async _createCompletion(params: any): Promise<any> {
    const url = `${this.normalizedEndpoint}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey && this.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    }

    const wantsStream = typeof params.onChunk === 'function' || params.stream === true;

    // Handle Streaming Path
    if (wantsStream && typeof params.onChunk === 'function') {
      try {
        const streamHeaders = {
          ...headers,
          'Accept': 'text/event-stream'
        };
        const streamPayload: Record<string, any> = {
          model: this.modelName?.trim() || 'default',
          messages: params.messages,
          temperature: params.temperature ?? 0.2,
          stream: true
        };
        if (typeof params.max_tokens === 'number') {
          streamPayload.max_tokens = params.max_tokens;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: streamHeaders,
          body: JSON.stringify(streamPayload),
          signal: params.signal
        });

        if (res.ok && res.body && typeof (res.body as any).getReader === 'function') {
          const reader = (res.body as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder('utf-8');
          let fullText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    fullText += delta;
                    params.onChunk(delta);
                  }
                } catch {}
              }
            }
          }

          if (fullText.trim().length > 0) {
            return {
              choices: [
                {
                  message: {
                    content: fullText,
                    role: 'assistant'
                  },
                  finish_reason: 'stop'
                }
              ]
            };
          }
        }
      } catch (streamErr) {
        // Fall back to standard non-streaming fetch if streaming fails or is unhandled
      }
    }

    // Standard Non-Streaming Path
    const nonStreamHeaders = {
      ...headers,
      'Accept': 'application/json'
    };

    const payload: Record<string, any> = {
      model: this.modelName?.trim() || 'default',
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      stream: false
    };

    if (typeof params.max_tokens === 'number') {
      payload.max_tokens = params.max_tokens;
    }

    if (params.response_format) {
      payload.response_format = params.response_format;
    }

    const executeFetch = async (bodyPayload: any) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: nonStreamHeaders,
        body: JSON.stringify(bodyPayload),
        signal: params.signal
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errData = await res.json();
          errMessage = errData?.error?.message || errData?.message || errMessage;
        } catch {}

        // If response_format caused an error (e.g. unhandled by some local models), retry once without it
        if (bodyPayload.response_format && (res.status === 400 || /response_format|json_object/i.test(errMessage))) {
          const retryPayload = { ...bodyPayload };
          delete retryPayload.response_format;
          return executeFetch(retryPayload);
        }

        throw new Error(errMessage);
      }

      return res.json();
    };

    const data = await executeFetch(payload);
    const choice = data?.choices?.[0];
    const content = choice?.message?.content ?? '';

    return {
      choices: [
        {
          message: {
            content,
            role: choice?.message?.role || 'assistant'
          },
          finish_reason: choice?.finish_reason || 'stop'
        }
      ]
    };
  }
}

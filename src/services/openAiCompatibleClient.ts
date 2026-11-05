/**
 * OpenAI-Compatible & LiteLLM API Client
 * Supports LiteLLM, Ollama, LM Studio, vLLM, LocalAI, and remote OpenAI endpoints
 * for Nova Browser's AI Assistant Sidebar.
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
    // If /models failed due to network unreachable, fail early
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
 * interface expected by AIAgent.
 */
export class OpenAICompatibleEngine {
  public chat = {
    completions: {
      create: async (params: {
        messages: any[];
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
        response_format?: any;
        signal?: AbortSignal;
        [key: string]: any;
      }): Promise<any> => {
        return this._createCompletion(params);
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
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey && this.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    }

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
        headers,
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

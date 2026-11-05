import assert from 'node:assert/strict';
import {
  normalizeOpenAIEndpoint,
  testOpenAIConnection,
  OpenAICompatibleEngine,
  AI_PROVIDER_PRESETS,
  getProviderPreset
} from '../src/services/openAiCompatibleClient';
import { aiAgent } from '../src/services/aiAgent';

async function runLiteLLMTests() {
  console.log('--- Testing LiteLLM & OpenAI-Compatible Backend Client ---');

  // Test 1: URL Normalization
  {
    assert.equal(normalizeOpenAIEndpoint('http://localhost:4000'), 'http://localhost:4000/v1');
    assert.equal(normalizeOpenAIEndpoint('http://localhost:4000/'), 'http://localhost:4000/v1');
    assert.equal(normalizeOpenAIEndpoint('http://localhost:4000/v1'), 'http://localhost:4000/v1');
    assert.equal(normalizeOpenAIEndpoint('http://localhost:4000/v1/'), 'http://localhost:4000/v1');
    assert.equal(normalizeOpenAIEndpoint('localhost:11434'), 'http://localhost:11434/v1');
    assert.equal(normalizeOpenAIEndpoint('https://api.openai.com/v1'), 'https://api.openai.com/v1');
    assert.equal(normalizeOpenAIEndpoint(''), 'http://localhost:4000/v1');
    assert.equal(normalizeOpenAIEndpoint('   '), 'http://localhost:4000/v1');
    console.log('[PASS] normalizeOpenAIEndpoint correctly handles various port, path, and protocol formats');
  }

  // Test 2: Connection Testing with Mock Fetch
  {
    const originalFetch = globalThis.fetch;

    // Subtest 2.1: Successful /models response
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.endsWith('/models')) {
        return new Response(JSON.stringify({
          data: [{ id: 'llama3.3:latest' }, { id: 'qwen2.5-coder:32b' }, { id: 'deepseek-r1:14b' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('Not found', { status: 404 });
    };

    const res1 = await testOpenAIConnection('http://localhost:4000', 'sk-test-key');
    assert.equal(res1.ok, true);
    assert.deepEqual(res1.models, ['llama3.3:latest', 'qwen2.5-coder:32b', 'deepseek-r1:14b']);
    assert.ok(typeof res1.latencyMs === 'number' && res1.latencyMs >= 0);
    console.log('[PASS] testOpenAIConnection parses GET /models and extracts model identifiers');

    // Subtest 2.2: Fallback to POST /chat/completions when /models is 404
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.endsWith('/models')) {
        return new Response('No models endpoint', { status: 404 });
      }
      if (urlStr.endsWith('/chat/completions')) {
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'pong', role: 'assistant' } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('Error', { status: 500 });
    };

    const res2 = await testOpenAIConnection('http://localhost:11434/v1');
    assert.equal(res2.ok, true);
    assert.ok(res2.latencyMs !== undefined);
    console.log('[PASS] testOpenAIConnection falls back to 1-token /chat/completions when /models returns 404');

    // Subtest 2.3: Connection failure
    globalThis.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:4000');
    };

    const res3 = await testOpenAIConnection('http://localhost:4000');
    assert.equal(res3.ok, false);
    assert.ok(res3.error?.includes('ECONNREFUSED'));
    console.log('[PASS] testOpenAIConnection handles unreachable server error gracefully');

    globalThis.fetch = originalFetch;
  }

  // Test 3: OpenAICompatibleEngine Completion Request & Response Parsing
  {
    const originalFetch = globalThis.fetch;
    let capturedRequest: { url: string; headers: any; body: any } | null = null;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedRequest = {
        url: String(input),
        headers: init?.headers,
        body: JSON.parse(init?.body as string)
      };
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: 'Nova Browser with LiteLLM is responsive and fast.',
              role: 'assistant'
            },
            finish_reason: 'stop'
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const engine = new OpenAICompatibleEngine('http://localhost:4000/v1', 'llama3.3', 'secret-bearer-token');
    const reply = await engine.chat.completions.create({
      messages: [{ role: 'user', content: 'hello from test' }],
      temperature: 0.1,
      max_tokens: 500
    });

    assert.ok(capturedRequest);
    assert.equal(capturedRequest.url, 'http://localhost:4000/v1/chat/completions');
    assert.equal(capturedRequest.headers['Authorization'], 'Bearer secret-bearer-token');
    assert.equal(capturedRequest.body.model, 'llama3.3');
    assert.equal(capturedRequest.body.temperature, 0.1);
    assert.equal(capturedRequest.body.max_tokens, 500);
    assert.equal(reply.choices[0].message.content, 'Nova Browser with LiteLLM is responsive and fast.');
    assert.equal(reply.choices[0].message.role, 'assistant');
    console.log('[PASS] OpenAICompatibleEngine formats chat.completions.create request and parses response');

    // Subtest 3.2: Automatic retry without response_format when server returns 400
    let attemptCount = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      attemptCount++;
      const body = JSON.parse(init?.body as string);
      if (body.response_format) {
        return new Response(JSON.stringify({
          error: { message: 'response_format is not supported by this model' }
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"status":"ok"}', role: 'assistant' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const replyFormatRetry = await engine.chat.completions.create({
      messages: [{ role: 'user', content: 'test schema retry' }],
      response_format: { type: 'json_object' }
    });

    assert.equal(attemptCount, 2);
    assert.equal(replyFormatRetry.choices[0].message.content, '{"status":"ok"}');
    console.log('[PASS] OpenAICompatibleEngine automatically retries without response_format if model rejects it');

    // Subtest 3.3: SSE Streaming token stream
    const chunks: string[] = [];
    const streamPayload = [
      'data: {"choices":[{"delta":{"content":"Nova"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" AI"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" stream"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('');

    globalThis.fetch = async () => {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamPayload));
          controller.close();
        }
      });
      return new Response(readable, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };

    const streamResult = await engine.chat.completions.create(
      {
        messages: [{ role: 'user', content: 'stream test' }],
        stream: true
      },
      (token) => {
        chunks.push(token);
      }
    );

    assert.deepEqual(chunks, ['Nova', ' AI', ' stream']);
    assert.equal(streamResult.choices[0].message.content, 'Nova AI stream');
    console.log('[PASS] OpenAICompatibleEngine parses SSE text/event-stream chunks via ReadableStream');

    globalThis.fetch = originalFetch;
  }

  // Test 4: Provider Presets and Defaults
  {
    assert.ok(AI_PROVIDER_PRESETS.length >= 8);
    const ollama = getProviderPreset('ollama');
    assert.equal(ollama.name, 'Ollama');
    assert.equal(ollama.category, 'local');
    assert.equal(ollama.defaultEndpoint, 'http://localhost:11434/v1');
    assert.equal(ollama.requiresApiKey, false);

    const openRouter = getProviderPreset('openrouter');
    assert.equal(openRouter.name, 'OpenRouter');
    assert.equal(openRouter.category, 'cloud');
    assert.equal(openRouter.requiresApiKey, true);

    const fallback = getProviderPreset('non-existent-provider');
    assert.equal(fallback.id, 'custom');
    console.log('[PASS] AI_PROVIDER_PRESETS and getProviderPreset behave accurately with fallbacks');
  }

  // Test 5: AIAgent Backend Configuration & Model Display
  {
    // Mock localStorage
    const storage = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k)
    };

    assert.equal(aiAgent.getBackend(), 'webgpu');

    // Configure custom backend
    storage.set('nova_ai_backend', 'custom');
    storage.set('nova_ai_provider_preset', 'ollama');
    storage.set('nova_ai_custom_endpoint', 'http://192.168.1.100:11434/v1');
    storage.set('nova_ai_custom_model', 'qwen2.5-coder:32b');
    storage.set('nova_ai_temperature', '0.2');
    storage.set('nova_ai_personality', 'code');

    assert.equal(aiAgent.getBackend(), 'custom');
    const customCfg = aiAgent.getCustomConfig();
    assert.equal(customCfg.endpoint, 'http://192.168.1.100:11434/v1');
    assert.equal(customCfg.model, 'qwen2.5-coder:32b');
    assert.equal(customCfg.temperature, 0.2);
    assert.equal(customCfg.personality, 'code');
    assert.equal(aiAgent.getModelDisplayName(), 'Ollama: qwen2.5-coder:32b');

    // Switch to OpenRouter preset
    storage.set('nova_ai_provider_preset', 'openrouter');
    storage.set('nova_ai_custom_model', 'anthropic/claude-3.5-sonnet');
    assert.equal(aiAgent.getModelDisplayName(), 'OpenRouter: anthropic/claude-3.5-sonnet');

    // Custom fallback
    storage.set('nova_ai_provider_preset', 'custom');
    assert.equal(aiAgent.getModelDisplayName(), 'Custom Endpoint: anthropic/claude-3.5-sonnet');

    // Vision support heuristic for custom models
    storage.set('nova_ai_custom_model', 'qwen2.5-coder:32b');
    assert.equal(aiAgent.currentModelSupportsVision(), false); // coder model
    storage.set('nova_ai_custom_model', 'gpt-4o-mini');
    assert.equal(aiAgent.currentModelSupportsVision(), true); // 4o is vision
    storage.set('nova_ai_custom_model', 'llama-3.2-11b-vision-instruct');
    assert.equal(aiAgent.currentModelSupportsVision(), true); // vision keyword

    console.log('[PASS] AIAgent methods support custom backend configuration, personality, presets, vision detection and display naming');
  }

  console.log('ALL LITELLM / OPENAI-COMPATIBLE BACKEND TESTS PASSED CLEANLY.');
}

runLiteLLMTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});

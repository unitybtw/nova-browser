import assert from 'node:assert/strict';
import {
  normalizeOpenAIEndpoint,
  testOpenAIConnection,
  OpenAICompatibleEngine
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

    globalThis.fetch = originalFetch;
  }

  // Test 4: AIAgent Backend Configuration & Model Display
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
    storage.set('nova_ai_custom_endpoint', 'http://192.168.1.100:4000/v1');
    storage.set('nova_ai_custom_model', 'qwen2.5-coder:32b');

    assert.equal(aiAgent.getBackend(), 'custom');
    const customCfg = aiAgent.getCustomConfig();
    assert.equal(customCfg.endpoint, 'http://192.168.1.100:4000/v1');
    assert.equal(customCfg.model, 'qwen2.5-coder:32b');
    assert.equal(aiAgent.getModelDisplayName(), 'Custom: qwen2.5-coder:32b');

    // Vision support heuristic for custom models
    assert.equal(aiAgent.currentModelSupportsVision(), false); // coder model
    storage.set('nova_ai_custom_model', 'gpt-4o-mini');
    assert.equal(aiAgent.currentModelSupportsVision(), true); // 4o is vision
    storage.set('nova_ai_custom_model', 'llama-3.2-11b-vision-instruct');
    assert.equal(aiAgent.currentModelSupportsVision(), true); // vision keyword

    console.log('[PASS] AIAgent methods support custom backend configuration, vision detection and display naming');
  }

  console.log('ALL LITELLM / OPENAI-COMPATIBLE BACKEND TESTS PASSED CLEANLY.');
}

runLiteLLMTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});

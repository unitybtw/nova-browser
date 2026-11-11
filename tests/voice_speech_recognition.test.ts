import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analyzeSpeechEnergy,
  computeWeightedDownloadRatio,
  getPreferredVoiceLanguage,
  setPreferredVoiceLanguage,
  transcribeAudio,
} from '../src/services/localSpeechRecognition';

// ---------------------------------------------------------------------------
// 1. Byte-weighted download progress (never prematurely locks at 100% on JSON)
// ---------------------------------------------------------------------------
{
  const files = new Map<string, { loaded: number; total: number }>();
  files.set('config.json', { loaded: 2243, total: 2243 });
  const ratioAfterConfigOnly = computeWeightedDownloadRatio(files);
  assert.ok(
    ratioAfterConfigOnly < 0.05,
    `Finishing tiny config.json must stay < 5%, got ${(ratioAfterConfigOnly * 100).toFixed(2)}%`
  );

  files.set('onnx/encoder_model_quantized.onnx', { loaded: 10_124_990, total: 10_124_990 });
  const ratioAfterEncoder = computeWeightedDownloadRatio(files);
  assert.ok(
    ratioAfterEncoder > 0.15 && ratioAfterEncoder < 0.4,
    `Encoder completion should map around ~23%, got ${(ratioAfterEncoder * 100).toFixed(2)}%`
  );

  files.set('onnx/decoder_model_merged_quantized.onnx', { loaded: 30_719_241, total: 30_719_241 });
  const ratioNearComplete = computeWeightedDownloadRatio(files);
  assert.ok(
    ratioNearComplete >= 0.85 && ratioNearComplete <= 0.99,
    `Near-complete shards should cap at <= 99% until pipeline ready, got ${(ratioNearComplete * 100).toFixed(2)}%`
  );
  console.log('[PASS] Voice download progress stays weighted across shards (never freezes at 100% on config.json)');
}

// ---------------------------------------------------------------------------
// 2. Energy gate for silence vs audible speech
// ---------------------------------------------------------------------------
{
  const silence = new Float32Array(16000); // all zeros
  const sMetrics = analyzeSpeechEnergy(silence);
  assert.equal(sMetrics.peak, 0);
  assert.equal(sMetrics.rms, 0);

  const quietHiss = new Float32Array(16000);
  for (let i = 0; i < quietHiss.length; i++) quietHiss[i] = 0.0005 * Math.sin(i);
  const qMetrics = analyzeSpeechEnergy(quietHiss);
  assert.ok(qMetrics.rms < 0.002 && qMetrics.peak < 0.012);

  const audibleSpeech = new Float32Array(16000);
  for (let i = 0; i < audibleSpeech.length; i++) audibleSpeech[i] = 0.25 * Math.sin((2 * Math.PI * 220 * i) / 16000);
  const aMetrics = analyzeSpeechEnergy(audibleSpeech);
  assert.ok(aMetrics.rms > 0.1 && aMetrics.peak > 0.2);
  console.log('[PASS] Speech energy analyzer distinguishes silence from audible speech');
}

// ---------------------------------------------------------------------------
// 3. Voice dictation language persistence & navigator fallback
// ---------------------------------------------------------------------------
{
  const prevStorage = (globalThis as any).localStorage;
  const prevNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const store = new Map<string, string>();

  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: 'tr-TR', languages: ['tr-TR', 'en-US'] },
  });

  try {
    assert.equal(getPreferredVoiceLanguage(), 'tr', 'Defaults cleanly to Turkish when OS/browser language is tr-TR');
    assert.equal(setPreferredVoiceLanguage('en-US'), 'en');
    assert.equal(getPreferredVoiceLanguage(), 'en', 'Respects explicit persisted user dictation preference');
    assert.equal(setPreferredVoiceLanguage('tr'), 'tr');
    assert.equal(getPreferredVoiceLanguage(), 'tr');
    assert.equal(setPreferredVoiceLanguage('xx-INVALID'), 'en', 'Unsupported codes fall back cleanly to en');
    console.log('[PASS] Voice dictation language preference resolution & persistence verified');
  } finally {
    if (prevStorage === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = prevStorage;
    if (prevNavigator) Object.defineProperty(globalThis, 'navigator', prevNavigator);
  }
}

// ---------------------------------------------------------------------------
// 4. Static invariants: CSP safe WASM config, timeouts, and permission handling
// ---------------------------------------------------------------------------
{
  const sttSource = fs.readFileSync('src/services/localSpeechRecognition.ts', 'utf8');
  assert.ok(
    sttSource.includes('env.useWasmCache = false'),
    'localSpeechRecognition.ts must disable useWasmCache to avoid blob: CSP blocks under file://'
  );
  assert.ok(
    sttSource.includes('new URL(`./ort/${base}.mjs`, baseHref).href'),
    'localSpeechRecognition.ts must resolve ORT asset URLs against baseURI rather than chunk assets/ directory'
  );
  assert.ok(
    sttSource.includes('INFERENCE_TIMEOUT_MS') && sttSource.includes('MODEL_LOAD_TIMEOUT_MS'),
    'localSpeechRecognition.ts must bound both model download and Whisper inference with timeouts'
  );

  const chatInputSource = fs.readFileSync('src/components/ui/ai-chat-input.tsx', 'utf8');
  assert.ok(
    chatInputSource.includes("permResult.status === 'denied' || permResult.status === 'restricted'"),
    'ai-chat-input.tsx must only block explicitly denied permissions (never block not-determined on Windows/Linux)'
  );
  assert.ok(
    chatInputSource.includes('!isRecording && !isTranscribing'),
    'ai-chat-input.tsx must not collapse on blur/escape while transcription is active'
  );

  const mainSource = fs.readFileSync('electron/main.ts', 'utf8');
  assert.ok(
    mainSource.includes("requestingOrigin === 'file://'"),
    'electron/main.ts permission check handler must resolve opaque file:// requestingOrigin via webContents.getURL()'
  );
  console.log('[PASS] Production CSP WASM resolution, timeouts, and cross-platform permission guards verified');
}

// ---------------------------------------------------------------------------
// 5. Async validation guards on transcribeAudio
// ---------------------------------------------------------------------------
export async function runVoiceGuardChecks(): Promise<void> {
  await assert.rejects(
    () => transcribeAudio(new Blob([], { type: 'audio/webm' })),
    /No audio was recorded/,
    'Empty recording must reject immediately without invoking model loader'
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => transcribeAudio(new Blob([new Uint8Array(64)], { type: 'audio/webm' }), { signal: controller.signal }),
    (err: any) => err?.name === 'AbortError',
    'Aborted transcription must reject immediately with AbortError'
  );
  console.log('[PASS] transcribeAudio input validation and AbortSignal cancellation verified');
}

void runVoiceGuardChecks().catch((err) => {
  console.error('[FAIL] Voice recognition suite error:', err);
  process.exit(1);
});

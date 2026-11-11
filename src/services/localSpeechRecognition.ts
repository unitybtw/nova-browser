import { logger } from '../utils/logger';

/**
 * On-device speech recognition.
 *
 * Why this exists: the previous implementation used `webkitSpeechRecognition`,
 * which cannot work inside Electron at all. Chromium's cloud recognizer needs
 * the Google Speech API key that only the Chrome binary ships; an Electron build
 * has no key, so the recognizer starts, opens the microphone successfully, and
 * then fails the round-trip with `error: network`.
 *
 * This service runs Whisper locally through transformers.js on WASM SIMD
 * (zero GPU/VRAM contention with WebLLM and deterministic latency). Model
 * shards are cached in userData by the main process (`model-cache-get` /
 * `model-cache-set`) because the packaged app runs on `file://`.
 */

/** Multilingual tiny model: ~44 MB of q8 encoder+decoder+tokenizer shards. */
export const LOCAL_STT_MODEL = 'onnx-community/whisper-tiny';
const TARGET_SAMPLE_RATE = 16_000;

/** Whisper expects 30s chunks; longer input is split by the pipeline. */
const MAX_AUDIO_SECONDS = 120;

/** Approximate total download footprint across all q8 shards + tokenizer JSON. */
const EXPECTED_MODEL_TOTAL_BYTES = 44_600_000;
const MODEL_LOAD_TIMEOUT_MS = 90_000;
const STALL_TIMEOUT_MS = 30_000;
const DECODE_TIMEOUT_MS = 15_000;
const INFERENCE_TIMEOUT_MS = 35_000;
const VOICE_LANGUAGE_STORAGE_KEY = 'nova_voice_language';

export interface SttProgress {
  /** 0..0.99 across all shards, or null once loading has finished. */
  ratio: number | null;
  file: string;
  /**
   * `'ready'` is the only terminal status this service emits, and the only one
   * ever paired with `ratio: null`. transformers.js also dispatches `'done'` once
   * per file, which we fold into byte-weighted `'progress'` so tiny JSON configs
   * never prematurely jump the indicator to 100%.
   */
  status: 'download' | 'progress' | 'ready' | 'done';
}

export interface TranscribeOptions {
  /** BCP-47 tag from the UI / voice selector; overrides auto-resolved preference. */
  locale?: string;
  onProgress?: (progress: SttProgress) => void;
  signal?: AbortSignal;
}

export interface VoiceLanguageOption {
  code: string;
  label: string;
  name: string;
}

export const SUPPORTED_VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'tr', label: 'TR', name: 'Türkçe' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'nl', label: 'NL', name: 'Nederlands' },
  { code: 'pl', label: 'PL', name: 'Polski' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'uk', label: 'UK', name: 'Українська' },
  { code: 'ja', label: 'JA', name: '日本語' },
  { code: 'ko', label: 'KO', name: '한국어' },
  { code: 'zh', label: 'ZH', name: '中文' },
];

type AnyPipeline = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;

const LOCALE_TO_WHISPER: Record<string, string> = {
  tr: 'turkish',
  en: 'english',
  de: 'german',
  ar: 'arabic',
  fr: 'french',
  es: 'spanish',
  it: 'italian',
  nl: 'dutch',
  pl: 'polish',
  ru: 'russian',
  uk: 'ukrainian',
  pt: 'portuguese',
  ja: 'japanese',
  ko: 'korean',
  zh: 'chinese',
};

let pipelinePromise: Promise<AnyPipeline> | null = null;
let loadedPipeline: AnyPipeline | null = null;
let transformersModule: any = null;
let currentLoadProgress: SttProgress | null = null;
const progressListeners = new Set<(p: SttProgress) => void>();

function getElectronAPI(): any {
  return (globalThis as any).window?.electronAPI;
}

/**
 * Resolves the user's preferred dictation language. Falls back to the browser's
 * system/preferred languages (so Turkish systems default cleanly to 'tr' even
 * when the browser chrome UI is English).
 */
export function getPreferredVoiceLanguage(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY);
      if (saved && LOCALE_TO_WHISPER[saved.toLowerCase()]) {
        return saved.toLowerCase();
      }
    }
  } catch {}

  try {
    const nav = (globalThis as any).navigator;
    const candidates: string[] = [];
    if (Array.isArray(nav?.languages)) candidates.push(...nav.languages);
    if (typeof nav?.language === 'string') candidates.push(nav.language);
    for (const tag of candidates) {
      const base = String(tag || '').toLowerCase().split(/[-_]/)[0];
      if (LOCALE_TO_WHISPER[base]) {
        return base;
      }
    }
  } catch {}

  return 'en';
}

export function setPreferredVoiceLanguage(code: string): string {
  const normalized = String(code || '').toLowerCase().split(/[-_]/)[0];
  const resolved = LOCALE_TO_WHISPER[normalized] ? normalized : 'en';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, resolved);
    }
  } catch {}
  return resolved;
}

export function isLocalSttLoaded(): boolean {
  return loadedPipeline !== null;
}

function isTrustedModelKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  if (/^[a-z0-9._-]+\/[a-z0-9._\-/]+$/i.test(key)) return true;
  try {
    const parsed = new URL(key);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    return /(^|\.)(huggingface\.co|hf\.co)$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function cacheLog(message: string, err?: unknown) {
  console.warn(`[LocalSTT] ${message}`, err ?? '');
}

/**
 * Resolves ORT wasm/mjs URLs against the document base URI rather than the
 * chunk directory (`dist/assets/`) so dynamic `import()` always finds `dist/ort/`
 * in packaged `file://` builds as well as `http://localhost:5173/ort/` in dev.
 */
function configureOnnxRuntime(env: any) {
  // Never wrap the ONNX runtime factory JS into a `blob:` URL — production CSP
  // (`script-src 'self' 'wasm-unsafe-eval'`) blocks `import(blob:...)` even
  // when Cache API is exposed under `file://`.
  env.useWasmCache = false;

  const wasm = env?.backends?.onnx?.wasm;
  if (!wasm) {
    cacheLog(
      'env.backends.onnx.wasm is missing, so the ORT wasm path was NOT configured.'
    );
    return;
  }

  const base = 'ort-wasm-simd-threaded.asyncify';
  let baseHref: string | undefined;
  try {
    if (typeof document !== 'undefined' && document.baseURI) {
      baseHref = document.baseURI;
    } else if (typeof window !== 'undefined' && window.location?.href) {
      baseHref = window.location.href;
    }
  } catch {}

  wasm.wasmPaths = baseHref
    ? {
        mjs: new URL(`./ort/${base}.mjs`, baseHref).href,
        wasm: new URL(`./ort/${base}.wasm`, baseHref).href,
      }
    : {
        mjs: `./ort/${base}.mjs`,
        wasm: `./ort/${base}.wasm`,
      };

  wasm.numThreads = 1;
  wasm.proxy = false;
}

function createIpcCache() {
  const api = getElectronAPI();
  if (!api?.modelCacheGet || !api?.modelCacheSet) {
    cacheLog('Model cache IPC unavailable; the model will be re-downloaded each session.');
    return null;
  }
  return {
    async match(request: string) {
      try {
        const key = typeof request === 'string' ? request : String(request);
        if (!isTrustedModelKey(key)) return undefined;
        const buffer = await api.modelCacheGet(key);
        if (!buffer || buffer.byteLength === 0) return undefined;
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': guessContentType(key),
            'Content-Length': String(buffer.byteLength),
          },
        });
      } catch (err) {
        cacheLog('Model cache read failed for ' + request, err);
        return undefined;
      }
    },
    async put(request: string, response: Response) {
      try {
        const key = typeof request === 'string' ? request : String(request);
        if (!isTrustedModelKey(key)) return;
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength === 0) return;
        const stored = await api.modelCacheSet(key, buffer);
        if (!stored) cacheLog('Model cache write was rejected for ' + key);
      } catch (err) {
        cacheLog('Model cache write failed for ' + request, err);
      }
    },
  };
}

function guessContentType(url: string): string {
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.onnx')) return 'application/octet-stream';
  if (url.endsWith('.onnx_data')) return 'application/octet-stream';
  if (url.endsWith('.mjs')) return 'text/javascript';
  if (url.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
}

function emitProgress(progress: SttProgress) {
  currentLoadProgress = progress.status === 'ready' ? null : progress;
  progressListeners.forEach((listener) => {
    try {
      listener(progress);
    } catch {}
  });
}

function withProgressSubscription<T>(
  work: Promise<T>,
  onProgress?: (p: SttProgress) => void
): Promise<T> {
  if (!onProgress) return work;
  progressListeners.add(onProgress);
  if (currentLoadProgress) {
    try {
      onProgress(currentLoadProgress);
    } catch {}
  }
  return work.finally(() => {
    progressListeners.delete(onProgress);
  });
}

/**
 * Computes byte-weighted download ratio across shards so tiny config JSON files
 * never lock the progress indicator at 100% before ONNX weights finish.
 */
export function computeWeightedDownloadRatio(
  files: ReadonlyMap<string, { loaded: number; total: number }>,
  expectedFloorBytes: number = EXPECTED_MODEL_TOTAL_BYTES
): number {
  let loadedBytes = 0;
  let knownTotalBytes = 0;
  files.forEach((entry) => {
    const safeTotal = Number.isFinite(entry.total) && entry.total > 0 ? entry.total : 0;
    const safeLoaded = Number.isFinite(entry.loaded) && entry.loaded > 0 ? entry.loaded : 0;
    loadedBytes += safeTotal > 0 ? Math.min(safeLoaded, safeTotal) : safeLoaded;
    knownTotalBytes += safeTotal;
  });
  const denominator = Math.max(knownTotalBytes, expectedFloorBytes, 1);
  return Math.min(0.99, Math.max(0, loadedBytes / denominator));
}

/**
 * Loads the Whisper STT pipeline onto WASM SIMD. Reuses an active load or ready
 * instance; resets cleanly on failure/timeout so future attempts never get stuck.
 */
export function loadLocalStt(onProgress?: (p: SttProgress) => void): Promise<AnyPipeline> {
  if (loadedPipeline) {
    if (onProgress) {
      try {
        onProgress({ ratio: null, file: '', status: 'ready' });
      } catch {}
    }
    return Promise.resolve(loadedPipeline);
  }

  if (pipelinePromise) {
    return withProgressSubscription(pipelinePromise, onProgress);
  }

  const runLoad = (async () => {
    let lastActivityAt = Date.now();
    const transformers = await import('@huggingface/transformers');
    transformersModule = transformers;
    const env = transformers.env;
    env.allowLocalModels = false;
    env.useBrowserCache = false;
    env.useWasmCache = false;
    configureOnnxRuntime(env);

    // Ensure HuggingFace HTTP requests fail fast on network stalls rather than hanging forever
    const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
    if (nativeFetch) {
      env.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.signal) return nativeFetch(input, init);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
        return nativeFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
      };
    }

    const cache = createIpcCache();
    if (cache) {
      env.useCustomCache = true;
      env.customCache = cache;
    } else {
      env.useBrowserCache = false;
      env.useCustomCache = false;
    }

    logger.info('LocalSTT', `Loading ${LOCAL_STT_MODEL} on wasm`);

    const perFileBytes = new Map<string, { loaded: number; total: number }>();
    let reportedRatio = 0;
    let reportedTerminal = false;

    const reportReady = () => {
      if (reportedTerminal) return;
      reportedTerminal = true;
      emitProgress({ ratio: null, file: '', status: 'ready' });
    };

    const reportBytes = (status: 'download' | 'progress', file: string) => {
      lastActivityAt = Date.now();
      const weighted = computeWeightedDownloadRatio(perFileBytes);
      reportedRatio = Math.max(reportedRatio, weighted);
      emitProgress({ ratio: reportedRatio, file, status });
    };

    const buildPromise = transformers.pipeline('automatic-speech-recognition', LOCAL_STT_MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (info: any) => {
        const status = info?.status;
        const key = String(info?.file || '');
        if (status === 'download' || status === 'initiate') {
          if (!perFileBytes.has(key)) {
            perFileBytes.set(key, { loaded: 0, total: Number(info?.total) || 0 });
          }
          reportBytes('download', key);
        } else if (status === 'progress') {
          const prev = perFileBytes.get(key) ?? { loaded: 0, total: 0 };
          const total = typeof info?.total === 'number' && info.total > 0 ? info.total : prev.total;
          let loaded = typeof info?.loaded === 'number' && info.loaded >= 0 ? info.loaded : prev.loaded;
          if (loaded === 0 && total > 0 && typeof info?.progress === 'number') {
            loaded = Math.round((Math.min(100, Math.max(0, info.progress)) / 100) * total);
          }
          perFileBytes.set(key, {
            loaded: Math.max(prev.loaded, loaded),
            total: Math.max(prev.total, total),
          });
          reportBytes('progress', key);
        } else if (status === 'done') {
          const prev = perFileBytes.get(key) ?? { loaded: 0, total: 0 };
          const total = prev.total > 0 ? prev.total : prev.loaded;
          perFileBytes.set(key, { loaded: total, total });
          reportBytes('progress', key);
        } else if (status === 'ready') {
          reportReady();
        }
      },
    });

    // Guard against silent hangs where neither bytes nor pipeline completion occur
    let stallTimer: ReturnType<typeof setInterval> | null = null;
    let totalTimer: ReturnType<typeof setTimeout> | null = null;

    const timeoutRace = new Promise<never>((_, reject) => {
      totalTimer = setTimeout(() => {
        reject(new Error('Model preparation timed out. Check your connection and try again.'));
      }, MODEL_LOAD_TIMEOUT_MS);
      stallTimer = setInterval(() => {
        if (Date.now() - lastActivityAt > STALL_TIMEOUT_MS) {
          reject(new Error('Model download stalled. Check your connection and try again.'));
        }
      }, 2000);
    });

    try {
      const pipe = (await Promise.race([buildPromise, timeoutRace])) as AnyPipeline;
      loadedPipeline = pipe;
      reportReady();
      return pipe;
    } finally {
      if (stallTimer) clearInterval(stallTimer);
      if (totalTimer) clearTimeout(totalTimer);
    }
  })();

  pipelinePromise = runLoad.catch((err) => {
    pipelinePromise = null;
    loadedPipeline = null;
    currentLoadProgress = null;
    throw err;
  });

  return withProgressSubscription(pipelinePromise, onProgress);
}

/**
 * Starts warming up the local STT pipeline while recording is still active,
 * eliminating the post-stop wait on subsequent clicks. Errors are swallowed
 * here because the foreground `transcribeAudio` call will report them if still failing.
 */
export function preloadLocalStt(onProgress?: (p: SttProgress) => void): void {
  loadLocalStt(onProgress).catch((err) => {
    logger.warn('LocalSTT', 'Background preload did not complete cleanly', err);
  });
}

export async function disposeLocalStt(): Promise<void> {
  const pipe = loadedPipeline ?? (await pipelinePromise?.catch(() => null));
  pipelinePromise = null;
  loadedPipeline = null;
  currentLoadProgress = null;
  try {
    await (pipe as any)?.dispose?.();
  } catch (_) {}
  transformersModule = null;
}

/** Measures RMS energy & peak amplitude before any normalization boost. */
export function analyzeSpeechEnergy(samples: Float32Array): { peak: number; rms: number } {
  if (!samples || samples.length === 0) return { peak: 0, rms: 0 };
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    const abs = v < 0 ? -v : v;
    if (abs > peak) peak = abs;
    sumSq += v * v;
  }
  return {
    peak,
    rms: Math.sqrt(sumSq / samples.length),
  };
}

/**
 * Decodes recorded audio to the mono 16 kHz Float32Array Whisper expects.
 * Preserves raw signal level without inflating silence/background hiss.
 */
export async function decodeToWhisperInput(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AudioCtx) throw new Error('AudioContext is unavailable in this environment.');

  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await withTimeout(
      ctx.decodeAudioData(arrayBuffer),
      DECODE_TIMEOUT_MS,
      'Audio decoding timed out.'
    );
  } finally {
    void ctx.close().catch(() => {});
  }

  const maxFrames = TARGET_SAMPLE_RATE * MAX_AUDIO_SECONDS;
  const frames = Math.max(
    1,
    Math.min(Math.ceil(decoded.duration * TARGET_SAMPLE_RATE), maxFrames)
  );
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;

  const gain = offline.createGain();
  gain.gain.value = 1;
  source.connect(gain);
  gain.connect(offline.destination);
  source.start();

  const rendered = await withTimeout(
    offline.startRendering(),
    DECODE_TIMEOUT_MS,
    'Audio resampling timed out.'
  );
  const mono = rendered.getChannelData(0);

  // Measure energy before normalization: only boost genuine audible audio (not silent hiss)
  const { peak, rms } = analyzeSpeechEnergy(mono);
  if (peak >= 0.012 && rms >= 0.002 && peak < 0.9) {
    const scale = Math.min(4, 0.9 / peak);
    for (let i = 0; i < mono.length; i++) mono[i] *= scale;
  }

  return mono;
}

function resolveWhisperLanguage(locale?: string): string | undefined {
  const candidate = locale || getPreferredVoiceLanguage();
  const lang = candidate.toLowerCase().split(/[-_]/)[0];
  return LOCALE_TO_WHISPER[lang];
}

function abortError(): Error {
  const err = new Error('Transcription cancelled.');
  err.name = 'AbortError';
  return err;
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    work.then(
      (value) => {
        if (timer) clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

const WHISPER_SILENCE_ARTIFACTS_RE =
  /^(?:thank you\.?|thanks for watching\.?|you|bye\.?|subtitles by .*|\[.*\]|\(.*\)|\.+|…+)$/i;

/**
 * Transcribes a recorded clip. Returns trimmed text, or an empty string when
 * the audio contained no speech (silence, ambient noise, mic bump).
 */
export async function transcribeAudio(
  blob: Blob,
  options: TranscribeOptions = {}
): Promise<string> {
  if (!blob || blob.size === 0) {
    throw new Error('No audio was recorded.');
  }

  options.signal?.throwIfAborted();

  // Decode audio first so too-short or silent clips fail cleanly without
  // spinning on a model download or running useless Whisper inference.
  const audio = await abortable(decodeToWhisperInput(blob), options.signal);
  if (audio.length < TARGET_SAMPLE_RATE * 0.25) {
    throw new Error('Recording was too short to transcribe.');
  }

  const { peak, rms } = analyzeSpeechEnergy(audio);
  if (rms < 0.002 && peak < 0.012) {
    return '';
  }
  options.signal?.throwIfAborted();

  const pipe = await abortable(loadLocalStt(options.onProgress), options.signal);
  options.signal?.throwIfAborted();

  const language = resolveWhisperLanguage(options.locale);
  let result: any;
  try {
    result = await abortable(
      withTimeout(
        pipe(audio, {
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
          max_new_tokens: 128,
          no_repeat_ngram_size: 3,
          repetition_penalty: 1.15,
          ...(language ? { language, task: 'transcribe' } : {}),
        }),
        INFERENCE_TIMEOUT_MS,
        'Speech recognition timed out.'
      ),
      options.signal
    );
  } catch (err: any) {
    // Do not keep a potentially wedged ONNX session alive after a non-abort failure
    if (err?.name !== 'AbortError') {
      loadedPipeline = null;
      pipelinePromise = null;
    }
    throw err;
  }

  const rawText = Array.isArray(result) ? result[0]?.text : result?.text;
  const cleaned = String(rawText || '').trim();
  if (!cleaned) return '';
  if (rms < 0.025 && WHISPER_SILENCE_ARTIFACTS_RE.test(cleaned)) {
    return '';
  }
  return cleaned;
}

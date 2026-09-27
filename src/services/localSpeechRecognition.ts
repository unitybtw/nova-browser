import { logger } from '../utils/logger';

/**
 * On-device speech recognition.
 *
 * Why this exists: the previous implementation used `webkitSpeechRecognition`,
 * which cannot work inside Electron at all. Chromium's cloud recognizer needs
 * the Google Speech API key that only the Chrome binary ships; an Electron build
 * has no key, so the recognizer starts, opens the microphone successfully, and
 * then fails the round-trip with `error: network`. Reproduced in a bare Electron
 * app with a fake capture device, so it is not caused by permissions, the
 * adblocker, or the CSP. It was also the wrong design for a privacy browser:
 * the audio would have been streamed to Google.
 *
 * This service runs Whisper locally through transformers.js instead. Nothing
 * leaves the device, and the model shards are cached in userData by the main
 * process (`model-cache-get`/`model-cache-set`) because the packaged app runs on
 * a `file://` origin where the Cache API is unavailable.
 */

/** Multilingual tiny model: ~41 MB of q8 encoder+decoder shards. */
export const LOCAL_STT_MODEL = 'onnx-community/whisper-tiny';
const TARGET_SAMPLE_RATE = 16_000;

/** Whisper expects 30s chunks; longer input is split by the pipeline. */
const MAX_AUDIO_SECONDS = 120;

export interface SttProgress {
  /** 0..1 across all shards, or null once loading has finished. */
  ratio: number | null;
  file: string;
  /**
   * `'ready'` is the only terminal status this service emits, and the only one
   * ever paired with `ratio: null`. transformers.js also dispatches `'done'`,
   * but it does so once per file rather than once per load, so a single file
   * finishing is reported here as an ordinary `'progress'` event at ratio 1.
   * `'done'` stays in the union so existing consumer checks for it keep
   * compiling.
   */
  status: 'download' | 'progress' | 'ready' | 'done';
}

export interface TranscribeOptions {
  /** BCP-47 tag from the UI, used to skip language detection. */
  locale?: string;
  onProgress?: (progress: SttProgress) => void;
  signal?: AbortSignal;
}

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
let transformersModule: any = null;

function getElectronAPI(): any {
  return (globalThis as any).window?.electronAPI;
}

/**
 * Cache keys arrive as the resolved remote URL when a custom (non-FileCache)
 * backend is used, but `tryCache` also probes a repo-relative path first.
 * Accept both, and only ever persist keys naming a model on the HF hosts.
 */
function isTrustedModelKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  // repo-relative path, e.g. onnx-community/whisper-tiny/onnx/encoder_model.onnx
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

// The app logger redacts some forwarded renderer output, which would hide real
// cache failures. Report these through the console with an explicit prefix.
function cacheLog(message: string, err?: unknown) {
  console.warn(`[LocalSTT] ${message}`, err ?? '');
}

/**
 * onnxruntime-web resolves its wasm through `env.backends.onnx.wasm.wasmPaths`,
 * which defaults to the **jsdelivr CDN**. The app's connect-src allowlist
 * blocks that (deliberately — it is a bare third-party origin and would leak a
 * request on every model load), so the runtime gets the copy shipped in
 * `public/ort/`, taken from the installed onnxruntime-web at build time.
 *
 * The variant must be `asyncify`: that is the build transformers.js resolves
 * and requests, not the WebGPU/JSEP build.
 */
function configureOnnxRuntime(env: any) {
  const wasm = env?.backends?.onnx?.wasm;
  if (!wasm) {
    // Report this loudly, because leaving it silent is the difference between a
    // five-second fix and an afternoon. Without wasmPaths the runtime falls back
    // to its built-in `new URL('./ort-wasm-simd-threaded.asyncify.<hash>.wasm',
    // import.meta.url)` — and `nova-drop-duplicate-onnx-wasm` in vite.config.ts
    // DELETES that hashed asset from the bundle, so model loading dies on a bare
    // 404 inside ort's own loader with nothing pointing at the cause. The usual
    // trigger is an onnxruntime-web/transformers upgrade that renames or moves
    // `env.backends.onnx`.
    cacheLog(
      'env.backends.onnx.wasm is missing, so the ORT wasm path was NOT configured. ' +
        'Model loading is expected to fail with a 404 for ' +
        'ort-wasm-simd-threaded.asyncify.<hash>.wasm, since the build deletes that ' +
        'hashed asset (see the nova-drop-duplicate-onnx-wasm plugin in vite.config.ts) ' +
        'and public/ort/ is then never pointed at. This usually means onnxruntime-web ' +
        'renamed or moved env.backends.onnx.'
    );
    return;
  }
  // The variant is dictated by what transformers.js imports — it is not a free
  // choice. transformers.js pulls in `onnxruntime-web/webgpu`, and that entry
  // point is the build whose own loader requests
  // `ort-wasm-simd-threaded.asyncify.wasm` by name. Pointing this at the plain
  // or jsep build 404s inside ort even though those files exist in
  // node_modules, and swapping the extension or dropping `asyncify` breaks it
  // the same way. Keep in step with public/ort/, which is a verbatim copy of
  // this build.
  const base = 'ort-wasm-simd-threaded.asyncify';
  wasm.wasmPaths = { mjs: `./ort/${base}.mjs`, wasm: `./ort/${base}.wasm` };
  // Keep the runtime single-threaded: the app sends COOP/COEP, but a lower
  // ceiling is safer than a silent fallback to cross-origin isolation.
  if (typeof wasm.numThreads !== 'number') wasm.numThreads = 1;
  wasm.proxy = false;
}

/**
 * Disk-backed cache for model shards. The Cache API does not exist on the
 * `file://` origin the packaged app is served from, so without this the whole
 * model would be re-downloaded on every launch.
 */
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
            // Required by transformers.js's read path, which sizes its buffer
            // from this header (readResponse in utils/hub). Missing it means
            // `total` starts at 0, so the buffer is reallocated and fully
            // re-copied on every chunk, and "Unable to determine content-length"
            // is logged for every file on every launch. The length is already in
            // hand: the cache stores only the bytes, so the header the network
            // response carried has to be restated here.
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

async function selectDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    const gpu = (globalThis as any).navigator?.gpu;
    if (gpu) {
      const adapter = await gpu.requestAdapter();
      if (adapter) return 'webgpu';
    }
  } catch (_) {
    // fall through to wasm
  }
  return 'wasm';
}

/** Loads the pipeline, downloading shards on first use. Idempotent. */
export function loadLocalStt(onProgress?: (p: SttProgress) => void): Promise<AnyPipeline> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const transformers = await import('@huggingface/transformers');
    transformersModule = transformers;
    const env = transformers.env;
    env.allowLocalModels = false;
    env.useBrowserCache = false;
    configureOnnxRuntime(env);

    const cache = createIpcCache();
    if (cache) {
      env.useCustomCache = true;
      env.customCache = cache;
    } else {
      // No cache backend: transformers.js would otherwise try the Cache API,
      // which throws on this origin and takes the whole load down with it.
      env.useBrowserCache = false;
      env.useCustomCache = false;
    }

    const device = await selectDevice();
    logger.info('LocalSTT', `Loading ${LOCAL_STT_MODEL} on ${device}`);

    // transformers.js reports progress per FILE, not per load: `initiate` when
    // a file starts, `progress` repeatedly while it streams, and `done` when
    // that one file finishes. `done` is dispatched once per file (utils/hub.js),
    // so it must not be read as "the model is ready" — config.json is ~1 KB and
    // finishes while ~40 MB of encoder/decoder is still streaming, which would
    // clear the ring at 1% and then flicker it back on every later file. A
    // per-file `done` therefore only marks that file at 100% and re-reports a
    // ratio; only the global `ready` event, or build() resolving, ends the load.
    const perFile = new Map<string, number>();

    // The mean of perFile is not monotonic, so it is not what the UI is told. A
    // mean only moves forward with a fixed denominator, and every new file
    // enters at 0 on `initiate`: {0.6} = 60% becomes {0.6, 0} = 30%. The
    // WebGPU -> wasm retry re-emits `initiate` for the same keys and resets
    // them all, dropping the mean to 0 mid-load. perFile keeps tracking the true
    // per-file ratios while what the UI sees is clamped to a high-water mark, so
    // the displayed percentage is guaranteed non-decreasing.
    let reportedRatio = 0;
    let reportedTerminal = false;

    /** The one and only end-of-load event, emitted at most once per load. */
    const reportReady = () => {
      if (!onProgress || reportedTerminal) return;
      reportedTerminal = true;
      onProgress({ ratio: null, file: '', status: 'ready' });
    };

    const reportOverall = (status: 'download' | 'progress', file = '') => {
      if (!onProgress) return;
      const ratios = Array.from(perFile.values());
      const mean = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
      reportedRatio = Math.min(1, Math.max(reportedRatio, mean));
      onProgress({ ratio: reportedRatio, file, status });
    };

    const build = (targetDevice: 'webgpu' | 'wasm') =>
      transformers.pipeline('automatic-speech-recognition', LOCAL_STT_MODEL, {
        // q8 keeps the download at ~41 MB instead of ~150 MB.
        dtype: 'q8',
        device: targetDevice,
        progress_callback: (info: any) => {
          const status = info?.status;
          if (status === 'progress' && typeof info?.progress === 'number') {
            const key = String(info?.file || '');
            const ratio = Math.min(100, Math.max(0, info.progress)) / 100;
            perFile.set(key, Math.max(perFile.get(key) ?? 0, ratio));
            reportOverall('progress', key);
          } else if (status === 'download' || status === 'initiate') {
            const key = String(info?.file || '');
            perFile.set(key, 0);
            reportOverall('download', key);
          } else if (status === 'done') {
            // One file finished, not the load. Mark it at 100% and re-report a
            // ratio so the ring keeps filling for the files still streaming.
            const key = String(info?.file || '');
            perFile.set(key, 1);
            reportOverall('progress', key);
          } else if (status === 'ready') {
            reportReady();
          }
        },
      });

    try {
      const pipe = await build(device);
      reportReady();
      return pipe as AnyPipeline;
    } catch (err) {
      // WebGPU can be present but fail at runtime (no adapter, shader
      // compilation, driver quirk). Retry once on the CPU backend.
      if (device === 'webgpu') {
        logger.warn('LocalSTT', 'WebGPU pipeline failed, retrying on wasm', err);
        const pipe = await build('wasm');
        reportReady();
        return pipe as AnyPipeline;
      }
      throw err;
    }
  })();

  // A failed load must not poison every later attempt.
  pipelinePromise = pipelinePromise.catch(err => {
    pipelinePromise = null;
    throw err;
  });

  return pipelinePromise;
}

/**
 * Frees the pipeline and its wasm arena.
 *
 * Currently unreferenced: nothing in `src/` calls it yet, so the ~41 MB of
 * weights, the ort session and the wasm arena stay resident for the lifetime of
 * the renderer process. It is kept because it is the only thing that can release
 * that memory, and wiring it up to a UI affordance was out of scope for this
 * change. (The companion `isLocalSttLoaded()` predicate was deleted for the same
 * reason — unreferenced, and unlike this one it could not release anything.)
 */
export async function disposeLocalStt(): Promise<void> {
  const pipe = await pipelinePromise?.catch(() => null);
  pipelinePromise = null;
  try {
    await (pipe as any)?.dispose?.();
  } catch (_) {}
  transformersModule = null;
}

/**
 * Decodes recorded audio to the mono 16 kHz Float32Array Whisper expects.
 * `blob` is whatever MediaRecorder produced (webm/opus on Chromium).
 */
export async function decodeToWhisperInput(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AudioCtx) throw new Error('AudioContext is unavailable in this environment.');

  // Decode with the AudioContext for the hardware-supported rate…
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    void ctx.close();
  }

  // …then resample to 16 kHz mono through an OfflineAudioContext.
  //
  // The buffer is sized to the clip but never beyond MAX_AUDIO_SECONDS: only
  // the LEADING MAX_AUDIO_SECONDS of a recording is transcribed, so the cap is
  // applied to the frame count here, before the render, rather than by slicing
  // the result afterwards. Slicing after the fact bounded nothing — it had
  // already rendered and materialised the whole clip, so a mic left recording
  // for 30 minutes meant a ~29M-frame AudioBuffer plus a 115 MB Float32Array
  // that could get the renderer OOM-killed, with the slice then a no-op
  // because the length was already over the cap. Capping the frame count
  // bounds the render at 1920000 frames / 7.7 MB whatever the input length.
  const maxFrames = TARGET_SAMPLE_RATE * MAX_AUDIO_SECONDS;
  const frames = Math.max(
    1,
    Math.min(Math.ceil(decoded.duration * TARGET_SAMPLE_RATE), maxFrames)
  );
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;

  const gain = offline.createGain();
  // Whisper was trained on audio at roughly this level; MediaRecorder output
  // varies wildly with the input gain, which otherwise wrecks accuracy.
  gain.gain.value = 1;
  source.connect(gain);
  gain.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  const mono = rendered.getChannelData(0);

  // Simple peak normalisation. The length is already capped by the frame count
  // above, so there is nothing left to trim here.
  let peak = 0;
  for (let i = 0; i < mono.length; i++) {
    const v = Math.abs(mono[i]);
    if (v > peak) peak = v;
  }
  if (peak > 0 && peak < 0.9) {
    const scale = Math.min(4, 0.9 / peak);
    for (let i = 0; i < mono.length; i++) mono[i] *= scale;
  }

  return mono;
}

function resolveWhisperLanguage(locale?: string): string | undefined {
  if (!locale) return undefined;
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return LOCALE_TO_WHISPER[lang];
}

/**
 * Races a promise against an abort signal.
 *
 * The model download and Whisper inference both take seconds to minutes and
 * neither transformers.js nor onnxruntime accepts a cancellation signal, so a
 * plain `await` would leave the UI's cancel button doing nothing: the spinner
 * kept turning and the result was discarded only at the very end. Racing makes
 * the rejection immediate; the underlying work still finishes in the background
 * and its result is dropped, which is the correct trade for a dictation box.
 */
function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      err => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

function abortError(): Error {
  const err = new Error('Transcription cancelled.');
  err.name = 'AbortError';
  return err;
}

/**
 * Transcribes a recorded clip. Returns trimmed text, or an empty string when
 * the audio contained no speech (silence, a cough, a door).
 */
export async function transcribeAudio(
  blob: Blob,
  options: TranscribeOptions = {}
): Promise<string> {
  if (blob.size === 0) {
    throw new Error('No audio was recorded.');
  }

  options.signal?.throwIfAborted();

  const pipe = await abortable(loadLocalStt(options.onProgress), options.signal);
  options.signal?.throwIfAborted();

  const audio = await abortable(decodeToWhisperInput(blob), options.signal);
  if (audio.length < TARGET_SAMPLE_RATE * 0.2) {
    throw new Error('Recording was too short to transcribe.');
  }
  options.signal?.throwIfAborted();

  const language = resolveWhisperLanguage(options.locale);
  const result = await abortable(
    pipe(audio, {
      // A little prompt conditioning measurably reduces hallucinated output on
      // short clips (Whisper's well-known "thank you" loops).
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      ...(language ? { language, task: 'transcribe' } : {}),
    }),
    options.signal
  );

  const text = Array.isArray(result) ? result[0]?.text : result?.text;
  return String(text || '').trim();
}

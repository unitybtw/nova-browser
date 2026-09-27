import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// index.html keeps a loose CSP so the Vite dev server keeps working
// (HMR websocket, react-refresh inline bootstrap, eval-based transforms).
// For production builds the meta tag below is swapped for a hardened policy
// via transformIndexHtml (apply: 'build' keeps dev mode untouched).
//
// This string MUST stay byte-identical to the production response header in
// electron/main.ts (the PROD branch of its onHeadersReceived handler). A page's
// enforced CSP is the intersection of every policy delivered to it, so a
// directive present in only one copy contributes nothing — and it has never been
// verified which copy actually binds for a file:// load. Identical copies make
// the question moot; editing one without the other silently changes the
// intersection. See the longer rationale next to the header in main.ts; the
// points that matter here:
//  - style-src keeps 'unsafe-inline' deliberately: src/ has 136 `style={{...}}`
//    attributes (46 of them `-webkit-app-region: drag | no-drag` on the frameless
//    title bar) plus a runtime <style> element in ReaderMode.
//  - no frame-src: it falls back to default-src 'self'. The
//    `https://*.supabase.co` frame-src that used to live here only never took
//    effect and must not come back.
//  - no `blob:` in script-src: worker-src already allows blob: (the aiAgent
//    module Worker) and every createObjectURL use is an <img> or a download.
//  - frame-ancestors is ignored by browsers in a <meta> policy; it is listed
//    only to keep the two prod copies byte-identical.
const HARDENED_PROD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://huggingface.co https://*.huggingface.co https://hf.co https://*.hf.co https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

function hardenCspForProduction(): Plugin {
  return {
    name: 'nova-harden-csp-production',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i,
        `<meta http-equiv="Content-Security-Policy" content="${HARDENED_PROD_CSP}">`
      );
    }
  };
}

/**
 * onnxruntime-web statically references its wasm with
 * `new URL('…asyncify.wasm', import.meta.url)`, so Rollup emits a ~27 MB hashed
 * copy into dist/assets. The on-device speech runtime is pointed at `./ort/…`
 * instead (see services/localSpeechRecognition), which behaves identically in
 * dev and in a packaged build.
 *
 * The two files are copied OUT of node_modules at build time rather than being
 * committed to `public/`. They were originally hand-copied, which is a release
 * trap: `public/ort/` is untracked, so a fresh clone builds fine (Vite serves
 * `public/`) and ships an installer with an empty `dist/ort/`, and the feature
 * then fails on first use with a 404 inside ort's own loader. Copying at build
 * time means the copy can never be forgotten, and it stays pinned to whatever
 * onnxruntime-web the project actually resolved.
 *
 * The Rollup-emitted duplicate is dropped so the installer does not ship the
 * same 27 MB twice.
 */
const ORT_FILES = [
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm'
];

function provideLocalOnnxWasm(): Plugin {
  const ortDir = () => path.join(process.cwd(), 'node_modules/onnxruntime-web/dist');
  return {
    name: 'nova-local-onnx-wasm',
    // Dev: the dev server has no `public/ort/` to fall back on any more, so
    // serve the same two files from node_modules. One source of truth for both
    // dev and build.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/ort\/(ort-wasm-simd-threaded\.asyncify\.(?:mjs|wasm))$/.exec(
          (req.url || '').split('?')[0]
        );
        if (!match) return next();
        const file = path.join(ortDir(), match[1]);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.end('onnxruntime-web asset missing from node_modules');
          return;
        }
        res.setHeader(
          'Content-Type',
          match[1].endsWith('.mjs') ? 'text/javascript' : 'application/wasm'
        );
        res.end(fs.readFileSync(file));
      });
    },
    generateBundle(_options, bundle) {
      // Rollup already emitted its own hashed copy of the wasm; the runtime uses
      // ./ort/... instead, so drop the duplicate rather than ship 27 MB twice.
      for (const fileName of Object.keys(bundle)) {
        if (/ort-wasm-simd-threaded\..*\.wasm$/.test(fileName)) {
          delete bundle[fileName];
        }
      }

      const ortDist = ortDir();
      for (const name of ORT_FILES) {
        const source = path.join(ortDist, name);
        if (!fs.existsSync(source)) {
          // Loud, because the symptom otherwise surfaces as a runtime 404 deep
          // inside onnxruntime with no hint about the cause.
          this.error(`Missing ${source}; the on-device voice feature cannot build without it.`);
        }
        bundle[`ort/${name}`] = {
          type: 'asset',
          fileName: `ort/${name}`,
          name: `ort/${name}`,
          needsCodeReference: false,
          originalFileName: null,
          originalFileNames: [],
          source: fs.readFileSync(source)
        } as never;
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    hardenCspForProduction(),
    provideLocalOnnxWasm()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.4.9')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless'
    }
  },
  worker: {
    format: 'es'
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-dompurify': ['dompurify'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-readability': ['@mozilla/readability'],
          'web-llm': ['@mlc-ai/web-llm']
        }
      }
    }
  },
  base: './'
});

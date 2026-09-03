import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// index.html keeps a loose CSP so the Vite dev server keeps working
// (HMR websocket, react-refresh inline bootstrap, eval-based transforms).
// For production builds the meta tag below is swapped for a hardened policy
// via transformIndexHtml (apply: 'build' keeps dev mode untouched).
const HARDENED_PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Google Fonts (loaded via <link> in index.html) must stay allowed — the
  // header CSP in electron/main.ts allows them too; policies intersect.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // NOTE: `https:` in connect-src is intentionally broad — WebLLM downloads
  // model shards from arbitrary Hugging Face CDN URLs inside renderer workers,
  // which cannot be enumerated ahead of time.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws: wss: http://localhost:* https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src https://*.supabase.co",
  "form-action 'self'"
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    hardenCspForProduction()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.2.5')
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
          'web-llm': ['@mlc-ai/web-llm'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'dompurify'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-readability': ['@mozilla/readability']
        }
      }
    }
  },
  base: './'
});

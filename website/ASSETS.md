# Assets

All assets are served locally from `website/public/` or bundled via Vite; the site makes zero requests to external image or font hosts.

- **Typography:** `@fontsource/red-hat-display` (weights 700, 900) and `@fontsource/red-hat-text` (weights 400, 500) with both `latin` and `latin-ext` subsets bundled by Vite.
- **Brand marks (Orbital Eclipse Ring):** `public/images/nova-icon.svg` (Obsidian squircle app icon) and `public/images/nova-mark.svg` (transparent `#eef0f3` eccentric ring + `#1f2de6` Cobalt Nova flare used as the `O` in the hero wordmark and in the footer).
- **Embedded live Nova Browser v1.5.2 web demo:** `public/browser-demo/` (~2.2 MB lean production bundle of the real Nova Browser React application, excluding offline WebLLM/ONNX model runtimes, serving interactive `studio`, `vertical_tabs`, `ai`, and `split` demo modes).
- **Fresh Nova Browser v1.5.2 screenshots (1440×900 dark captures):**
  - `public/images/shot-studio.jpg`: Live Design Studio Layout tab (Classic Top, Compact Row, Vertical Left, Vertical Right + Interactive Toolbar Layout).
  - `public/images/shot-ai.jpg`: Vertical Tabs sidebar with active Local WebGPU AI assistant (`Llama 3.2 3B`).
  - `public/images/shot-split.jpg`: Dual Split View displaying a GitHub repository and New Tab side by side.
  - `public/images/shot-extensions.jpg`: Extensions modal with direct Chrome Web Store URL and 32-character extension ID installer bar.
  - `public/images/shot-sync.jpg`: Nova Sync sign-in dialog in dark mode.
- **Narrated product film:** `public/images/nova-tour.mp4`, `public/images/nova-tour.poster.jpg`, `public/images/nova-tour.en.vtt`, and `public/images/nova-tour.tr.vtt` played inside the native `<dialog>` overlay.

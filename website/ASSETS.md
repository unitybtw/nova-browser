# Assets

All assets are served locally from `website/public/` or bundled via Vite; the site makes zero requests to external image or font hosts.

- **Typography:** `@fontsource/red-hat-display` (weights 700, 900) and `@fontsource/red-hat-text` (weights 400, 500) with both `latin` and `latin-ext` subsets bundled by Vite.
- **Brand marks (Orbital Eclipse Ring):** `public/images/nova-icon.svg` (Obsidian squircle app icon) and `public/images/nova-mark.svg` (transparent `#eef0f3` eccentric ring + `#1f2de6` Cobalt Nova flare used as the `O` in the hero wordmark and in the footer).
- **Live Studio looping preview:** `public/images/hero-loop.webm` (~207 KB, silent VP9 clip trimmed from the clean dark segment of `tour.webm`) and `public/images/hero-loop.jpg` (~58 KB matching poster frame).
- **Real Nova Browser screenshots:**
  - `public/images/studio-layout.png`: real Live Design Studio shell layout controls capture (Classic Top, Compact Row, Vertical Left, Vertical Right).
  - `public/images/studio-dark.png`: real Live Design Studio dark mode and Advanced Surface Inspector capture.
  - `public/images/newtab-clean-light.jpg`: real light-theme New Tab capture.
  - `public/images/assistant-clean-light.jpg`: real Local WebGPU AI sidebar capture.
  - `public/images/tour-poster.jpg`: real dark-theme Split View capture.
  - `public/images/sync-clean-light.jpg`: real Nova Sync sign-in dialog capture.
- **Narrated product film:** `public/images/nova-tour.mp4`, `public/images/nova-tour.poster.jpg`, `public/images/nova-tour.en.vtt`, and `public/images/nova-tour.tr.vtt` played inside the native `<dialog>` overlay.

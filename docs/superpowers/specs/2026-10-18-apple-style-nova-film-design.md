# Nova Browser Apple-Style Launch Film Specification

## 1. Creative Direction & Visual Language
- **Aesthetic**: Apple Cupertino Keynote / Safari & macOS Product Film.
  - **Studio Light Chapters (Scenes 1, 2, 3, 6)**: Warm architectural alabaster/paper backdrop (`#f5f5f7` / `#fafaf7`), deep charcoal ink typography (`#1d1d1f`), subtle brushed aluminum window borders (`rgba(0,0,0,0.08)`), soft multi-layered contact shadows (`0 30px 90px rgba(15,23,42,0.12)`), and Manrope / SF Pro Display tight editorial headlines (`letter-spacing: -0.04em`).
  - **Apple Pro Dark Chapters (Scenes 4, 5)**: Smooth studio lighting transition into deep anodized titanium black (`#0a0a0c`), luminous silver typography (`#f5f5f7`), subtle specular glass rim highlights (`rgba(255,255,255,0.14)`), and authentic dark-mode Nova Browser UI.
  - **Zero Slop / Zero Cyberpunk**: Completely remove neon grids, spinning dashed radar circles, and fake dashboard telemetry cards.
- **Language**: 100% English across all UI labels, typography, captions, and voiceover.
- **Voiceover**: `en-US-AvaNeural` (warm, expressive, natural California keynote cadence).
- **Sound Design**: Minimalist warm electric-piano / felt-pad harmonic progression (`Fmaj9 -> Cmaj7/E -> Dm9 -> Am11 -> Bbmaj7 -> C6`) paired with frame-accurate UI sound effects:
  - Subtle macOS pointer click (`click_frames`) when the cursor clicks tabs, workspaces, Split View, or the AI button.
  - Soft mechanical/tactile keystroke ticks (`type_ranges`) synchronized with live typing in the address/command bar and Nova AI prompt.
  - Soft studio air transitions at chapter cuts.

## 2. Real Browser Choreography & Macro Camera Rig (36.0s, 30fps = 1080 frames)
1. **Scene 1 (`0.0s - 5.6s`, 168 frames) — Studio Light Reveal & Real New Tab**:
   - Voiceover: *"Meet Nova. A browser designed around focus, speed, and your own space."*
   - Visual: Minimalist Apple-style title reveal (`nova.`) that pulls back to reveal the real Nova Browser window in clean light mode (`workspaces-clean-light.jpg` + crisp live vector layer showing `02:06 PM`, `Good Afternoon`, `Shield Active`, and quick-access tiles).
2. **Scene 2 (`5.6s - 11.8s`, 186 frames) — Real Vertical Tabs, Workspaces & Command Bar (Macro Zoom Left -> Center)**:
   - Voiceover: *"Organize your day with vertical tabs, isolated workspaces, and an instant command bar."*
   - Visual: Camera performs a smooth spring macro zoom (`1.48x`) onto the real left sidebar (`Personal`, `Frontend Stack`, `React 19 Docs`, `Tailwind CSS v4`). The macOS pointer moves smoothly, clicks to expand/switch workspaces, and triggers `Cmd + K` Spotlight where real keystrokes type `"open split view: react docs"` with live autocomplete results.
3. **Scene 3 (`11.8s - 18.2s`, 192 frames) — Real Side-by-Side Split View & Smart Tab Hibernation**:
   - Voiceover: *"Work side by side in Split View, while inactive tabs quietly hibernate to save memory."*
   - Visual: The cursor clicks the Split View action; the real Nova Browser viewport smoothly divides into two live side-by-side webviews (`React 19 Documentation` on the left, `Nova GitHub Repository / Code Inspector` on the right), while inactive tabs in the sidebar show the subtle `Hibernated · Memory Saved` pill.
4. **Scene 4 (`18.2s - 25.0s`, 204 frames) — Transition to Apple Pro Dark & Real Nova AI Sidebar**:
   - Voiceover: *"Ask Nova Assistant anything. Powered by WebGPU, local models run right on your device."*
   - Visual: Studio lighting dims smoothly to Apple Pro Dark (`#0a0a0c`). The cursor clicks the `AI` button in the real Nova top bar (`assistant-clean-light.jpg` / live crisp dark/light adaptive inspector), sliding open the authentic `Nova AI · Llama 3.2 3B` right sidebar. The user prompt *"Summarize the architecture of this page"* is clicked, and Nova Assistant streams a clean, structured summary on-device.
5. **Scene 5 (`25.0s - 30.8s`, 174 frames) — Real Privacy Shield Popover & Encrypted Sync Modal**:
   - Voiceover: *"Built-in protection blocks trackers automatically, and end-to-end encryption keeps your sync private."*
   - Visual: Macro camera pans to the Nova toolbar as the cursor clicks the green Shield icon, opening the real Nova Privacy Shield popover (`Trackers & Ads Blocked`, `Strict Workspace Isolation`), alongside the authentic `Nova Sync` card (`sync-clean-light.jpg` + live `AES-256-GCM` verified status).
6. **Scene 6 (`30.8s - 36.0s`, 156 frames) — Studio Light Finale, Open Source & Multi-Platform**:
   - Voiceover: *"Free and open source for Mac, Windows, and Linux. Make room for Nova."*
   - Visual: Returns to warm Apple Studio Light (`#f5f5f7`). The full Nova Browser window settles in a floating hero composition beneath bold Apple-style editorial typography: *"Make room for Nova."* with `macOS`, `Windows`, `Linux` pills and `nova-browser.org`.

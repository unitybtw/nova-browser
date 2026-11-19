# Nova Browser v1.5.2 — Monumental Editorial Launch Film Design

**Format:** 1920×1080 (16:9), 60 fps, 42.0 seconds (2,520 frames), H.264 + AAC (`+faststart`), synced EN & TR WebVTT captions.  
**Composition:** `NovaLaunchFilm` in `video/src/NovaLaunchFilm.tsx` (registered in `video/src/Root.tsx`).  
**Website target:** `website/public/images/nova-tour.mp4`, `nova-tour.poster.jpg`, `nova-tour.en.vtt`, `nova-tour.tr.vtt`.

## Visual Identity
- **Color fields:** Full-bleed architectural alternation matching the redesigned website: Obsidian (`#0b0c0e`), Cool Stone (`#eef0f3`), Electric Cobalt (`#1f2de6`).
- **Typography:** Local `Red Hat Display` (700, 900) and `Red Hat Text` (400, 500) bundled directly into `video/public/launch-film/fonts/`.
- **Brand mark:** Orbital Eclipse Ring (`nova-mark.svg`) integrated as the monumental `O` in `N [O] V A` at open and close.
- **Footage:** 100% real 2× Retina (`2880×1800`) captures from the live Nova Browser v1.5.2 interface — including all four Live Design Studio tab geometries (*Classic Top*, *Compact Row*, *Vertical Left*, *Vertical Right*) plus Light theme, Vertical Workspaces, Split View, Local WebGPU AI, Extensions (Chrome Web Store URL/ID CRX3), and Nova Sync.

## 6-Act Storyboard (42.0s / 2,520 frames)
| Act | Time | Frames | Surface | Focus | English Narration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 00:00–00:06 | 0–360 | Obsidian `#0b0c0e` | Orbital Eclipse Ring & `N [O] V A` monumental open | "Meet Nova. The open-source desktop browser you reshape live." |
| 2 | 00:06–00:16 | 360–960 | Cool Stone `#eef0f3` | **Hero spotlight:** Live Design Studio morphing across 4 real tab geometries + Light mode | "Open Live Design Studio and reshape every bar in real time. Switch between four tab geometries, reorder your toolbar, and style each workspace your way." |
| 3 | 00:16–00:23 | 960–1380 | Obsidian `#0b0c0e` | Vertical Tabs, Workspaces & Dual Split View | "Isolate workspaces with vertical tabs, view two pages side by side in Split View, and let idle tabs sleep automatically." |
| 4 | 00:23–00:30 | 1380–1800 | Cool Stone `#eef0f3` | Local WebGPU AI Sidebar & On-Device Whisper Voice | "Summon Nova Assistant beside any page. Powered by WebGPU and local Whisper voice, models run directly on your own hardware." |
| 5 | 00:30–00:36 | 1800–2160 | Obsidian `#0b0c0e` | Chrome Web Store CRX3, Local MCP (26 tools), Ad Shield & AES-256-GCM Sync | "Install Chrome Web Store extensions, connect coding agents over local MCP, and protect your data with built-in ad blocking and AES-256 encrypted sync." |
| 6 | 00:36–00:42 | 2160–2520 | Cobalt `#1f2de6` → Obsidian `#0b0c0e` | Open-source MIT stamp & monumental `N [O] V A` finale | "Free and open source for macOS, Windows, and Linux. Make the web yours with Nova." |

## Audio Architecture
- **Voiceover:** `edge-tts` (`en-US-AvaMultilingualNeural`), exact per-clip durations probed with `ffprobe` to emit drift-free `nova-tour.en.vtt` and `nova-tour.tr.vtt`.
- **Score & UI SFX:** Custom stereo harmonic/kinetic pulse score synced to all 6 scene cuts and exact cursor click frames in Act 2, with automatic sidechain ducking under narration and `-14 LUFS` broadcast loudness mastering via `ffmpeg`.

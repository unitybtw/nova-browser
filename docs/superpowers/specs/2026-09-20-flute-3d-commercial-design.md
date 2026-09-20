# Nova Browser — 3D Promo Commercial Design Spec (Flute by Web Prodigies)

## Overview
This specification details the creation of a cinematic 3D promo commercial for Nova Browser using **Flute** (`@webprodigies/flute`), an open-source tool that renders live React UI components into a 3D canvas with realistic camera trajectories, focal depth-of-field, lighting, and video export.

---

## 1. Creative Direction: "Flagship Reveal" (English)
* **Target Audience:** Power users, developers, privacy advocates, and modern web enthusiasts.
* **Tone:** Sleek, confident, futuristic, minimalist, high-performance.
* **Duration & Resolution:** 7.0 seconds, 1080p (1920x1080) at 60 FPS.
* **Color Palette:**
  * Obsidian Black: `#0c0d12` (Background space)
  * Electric Indigo / Royal Blue: `#4338ca`, `#6366f1` (Volumetric rim lighting & flares)
  * Pure Crisp White / Charcoal: `#ffffff`, `#171717` (Typography & UI elements)
* **Sound / Mood (Conceptual):** Subtle ambient deep synth swell transitioning into an energetic precision snap.

---

## 2. Storyboard & Camera Choreography

```
[ 0.0s - 2.5s ] Wide Orbital Angle
   Camera: Orbit from (-250, 180, 900) to (-100, 120, 750)
   Focus: Deep focus on floating Nova Browser window
   Overlay: "NOVA BROWSER" — "The Sovereign Web Browser"

[ 2.5s - 5.0s ] Cinematic Dolly-In & Focus Pull
   Camera: Glides to (120, 40, 420), tilt 12 deg
   Focus: Shallow DoF pulls onto Omnibox, Sovereign Tab Bar & AI Copilot
   Overlay: "AI-Native. 120 FPS. Zero Bloat."

[ 5.0s - 7.0s ] Hero Presentation & CTA
   Camera: Elevates to (0, 60, 600), centered 3/4 perspective
   Focus: Full window sharp focus with specular light sweep
   Overlay: "Experience the next evolution of the web. Download Now."
```

---

## 3. Architecture & Implementation

### A. Host Application
* **Location:** `website/` (Vite 6 + React 19 + Tailwind v4).
* **Package:** `@webprodigies/flute` installed as a dependency.
* **Integration Mode:** Flute Vite adapter connects directly to the dev environment without impacting production bundles.

### B. Scene Definitions
* `website/src/flute/scenes/flagship-reveal.scene.json`:
  * Camera positions, rotations, field-of-view, depth of field (`focusDistance`, `focalLength`, `aperture`).
  * Lighting rigs (directional key light, ambient fill, tinted rim light).
* `website/src/flute/scenes/flagship-reveal.tsx`:
  * Live React component wrapping Nova's actual `BrowserDemo` (`App.tsx`).
  * English kinetic text overlays and particle atmosphere.

### C. Verification
* CLI synchronization with `npx flute sync`.
* Snapshot generation with `npx flute snapshot`.
* Flute Studio preview at `http://127.0.0.1:5173/flute`.

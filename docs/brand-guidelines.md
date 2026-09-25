# Brand Guidelines v1.0

> Last updated: 2026-09-25  
> Status: Official  
> Source of Truth: `docs/brand-guidelines.md`

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #06B6D4 |
| Secondary Color | #38BDF8 |
| Primary Font | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto |
| Voice | Sovereign, Precise, Restrained, Technical |

---

## 1. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Nova Cyan | #06B6D4 | rgb(6,182,212) | Primary brand accent, focused states, lens core |
| Nova Deep Cyan | #0891B2 | rgb(8,145,178) | Pressed states, high-contrast borders |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Horizon Sky | #38BDF8 | rgb(56,189,248) | Specular highlights, active tabs, bright links |
| Success Emerald | #10B981 | rgb(16,185,129) | Security verified, sync active |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Obsidian Ground | #020617 | rgb(2,6,23) | Deepest window layer, app tile base |
| Surface Canvas | #0B0F17 | rgb(11,15,23) | Browser chrome, topbar, tab strip |
| Surface Panel | #0F172A | rgb(15,23,42) | Side panels, cards, popovers |
| Surface Border | #1E293B | rgb(30,41,59) | Hairline borders |
| Text Primary | #F8FAFC | rgb(248,250,252) | Primary headings, active tab titles |
| Text Secondary | #94A3B8 | rgb(148,163,184) | Secondary labels, descriptions |
| Text Muted | #64748B | rgb(100,116,139) | Inactive icons, placeholders |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | #10B981 | Security badge, sync connected |
| Warning | #F59E0B | Memory limits, permissions requested |
| Error | #EF4444 | Network errors, blocked malicious hosts |
| Info | #06B6D4 | Informational indicators, downloads |

---

## 2. Typography

### Font Stack

--font-heading: '-apple-system'
--font-body: '-apple-system'
--font-mono: 'JetBrains Mono'

```css
/* Application Interface */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* Monospace / Code */
font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
```

---

## 3. Logo & Visual Identity

### The Celestial Compass Mark
The Nova logo embodies precision navigation, exploration, and speed. It combines an 8-facet celestial star with a central optical lens aperture inside an obsidian squircle.

```
       ▲  [North Cardinal Ray]
    ╲  │  ╱
     ╲ ┼ ╱    [Diagonal Intercardinal Rays]
   ─── ◉ ───  [Central Optical Aperture]
     ╱ ┼ ╲
    ╱  │  ╲
       ▼  [South Cardinal Ray]
```

### Proportions & Clear Space
- **Clear Space:** Equal to the radius of the central aperture `[x]` around all 4 sides.
- **Minimum Digital Size:**
  - Standalone vector icon: `16x16 px`
  - Squircle app icon: `24x24 px`
  - Print minimum: `10 mm`

### Approved Assets
- **SVG Vector (Master):** `public/logo.svg` & `website/public/logo.svg`
- **macOS App Bundle:** `build/icon.icns`
- **Windows Executable:** `build/icon.ico`
- **Linux & Universal PNG:** `build/icon.png` (1024x1024)
- **Web Favicon & Avatars:** `public/logo.png`, `public/nova-icon.png`

### Absolute Don'ts
- ❌ Do not apply rainbow, violet, or multi-stop gradients across the star rays.
- ❌ Do not rotate the compass away from the vertical cardinal axis.
- ❌ Do not add tacky drop shadows, bevel emboss filters, or outer glow halos.
- ❌ Do not distort, squeeze, or stretch the aspect ratio.

---

## 4. Voice & Tone

### Brand Personality

| Trait | Description |
|-------|-------------|
| **Sovereign** | Prioritizes local execution, user control, and zero telemetry |
| **Precise** | Clear, technical, concrete specifications without buzzwords |
| **Restrained** | Elegant, calm, and distraction-free desktop experience |

### Prohibited

| Avoid | Use Instead |
|-------|-------------|
| "Supercharge your workflow" | "Run local models and automate web tasks" |
| "Next-generation magic" | "On-device WebGPU neural execution" |
| "Blazing fast" | Concrete benchmarks and latency numbers |
| "Unleash the power" | "Native Model Context Protocol Server (Port 3020)" |

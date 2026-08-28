# Design System: Nova Sovereign Web

## Visual Identity & Philosophy

The design of Nova represents sovereign computing: focused, authoritative, fast, and local-first. We reject generic AI template habits (such as floating gradient text, kickers above headings, generic icon tiles, and emojis) in favor of high-contrast Roman typography, real on-device metrics, single-elevation surfaces, and immediate 1-click downloads.

## Color Strategy: Committed Dark

- **Background Base:** `#0d0f17` (Deep carbon-slate)
- **Surface Elevation:** `#141724` (Single 1px border `#252a3f`)
- **Card Fill:** `#1a1e2f`
- **Primary Cobalt Accent:** `#4f46e5` / `#4338ca` (Active states & download buttons)
- **Verified Emerald Signal:** `#10b981` (Zero-telemetry indicators & CLI outputs)
- **Tensor Cyan Signal:** `#06b6d4` (WebGPU compute & MCP protocol tools)

## Typography

- **Display Headings:** Plus Jakarta Sans & Space Grotesk (`font-weight: 800`, `letter-spacing: -0.03em`, roman only)
- **Body Copy:** Inter (`font-weight: 400/500`, measure capped at `68ch`)
- **Code & Telemetry:** JetBrains Mono (`font-weight: 600`)

## Component Language

1. **Buttons:** Minimum 48px height, unmistakable contrast, bold monospace uppercase labels.
2. **Surfaces:** Declared once via border `#252a3f` with subtle `#3d4466` hover transition.
3. **Simulators:** Interactive WebGPU compute console and RAM slider backed by authentic mathematical models.
4. **Downloads:** OS auto-detection + 1-click terminal package manager copy box.

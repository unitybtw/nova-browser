# Nova Browser Theme & Design System

## Part 1: Token Summary

### Color Palette
- Accent Color: `--color-accent` (Dynamic: Blue `#3b82f6`, Emerald `#10b981`, Purple `#a855f7`, Rose `#f43f5e`, Amber `#f59e0b`)
- Background Light: `#f8fafc` (slate-50), `#ffffff`
- Background Dark: `#0f172a` (slate-900), `#020617` (slate-950), `#1e293b` (slate-800)
- Surface Light: `#ffffff`, `#f1f5f9` (slate-100), `#e2e8f0` (slate-200)
- Surface Dark: `#1e293b` (slate-800), `#334155` (slate-700), `#0f172a` (slate-900)
- Text Light: `#0f172a` (slate-900), `#334155` (slate-700), `#64748b` (slate-500)
- Text Dark: `#f8fafc` (slate-50), `#e2e8f0` (slate-200), `#94a3b8` (slate-400)
- Border Light: `#e2e8f0` (slate-200), `#cbd5e1` (slate-300)
- Border Dark: `#334155` (slate-700), `rgba(255,255,255,0.1)`

### Typography
- Primary Sans: `'Inter', system-ui, -apple-system, sans-serif`
- Serif / Editorial: `'Lora', serif` (used for Reader Mode & Headings)
- Monospace: `'JetBrains Mono', 'Fira Code', monospace`

### Spacing & Sizing
- Base Radius: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full` (9999px)
- Shadows: Soft elevation with backdrop blur (`shadow-sm`, `shadow-md`, `shadow-xl`, `backdrop-blur-md`)
- TopBar Height: 38px tab strip + 44px address bar row
- Sidebar Width: 240px expanded, 64px collapsed

---

## Part 2: Raw Source Stylesheet (`src/index.css`)

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
  --color-accent: var(--nova-accent, var(--color-blue-500));
  --color-accent-hover: var(--nova-accent-hover, var(--color-blue-600));
  --color-accent-light: var(--nova-accent-light, var(--color-blue-100));
  --color-accent-dark: var(--nova-accent-dark, var(--color-blue-700));
  --color-accent-text: var(--nova-accent-text, #ffffff);
}

@layer utilities {
  .drag-region {
    -webkit-app-region: drag;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  user-select: none;
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

#root {
  height: 100%;
  width: 100%;
}

h1, h2, h3, h4, h5, h6, .font-serif {
  font-family: 'Lora', serif;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.28);
}

.modal-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.dark .modal-scroll {
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

/* Floating animation */
@keyframes float-up {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-float {
  animation: float-up 0.2s ease-out forwards;
}

/* Premium Interactive Globals */
button {
  transition-property: color, background-color, border-color, opacity, box-shadow, transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

button:active:not(:disabled) {
  transform: scale(0.96);
}

.premium-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.premium-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

/* Top bar specific styles */
.top-bar {
  background: var(--bg-main);
  border-bottom: 1px solid var(--border-color);
}

```

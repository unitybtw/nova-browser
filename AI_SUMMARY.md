# 🧠 Nova Browser — AI Agent Knowledge Base & Architecture Summary

> **Notice for AI Assistants (Claude, GPT, Gemini, Cursor, Copilot, Windsurf):**  
> Read this document first when starting a session in this repository. It provides an authoritative technical breakdown of Nova Browser's architecture, state flow, IPC channels, features, critical conventions, and build instructions.

---

## 1. Project Overview & Tech Stack

Nova Browser is an open-source, sovereign, high-performance desktop web browser designed for modern AI workflows, power users, and deep focus.

- **Shell / Runtime**: Electron (v33+) + Chromium + Node.js (v20+)
- **Renderer Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide Icons
- **AI Engine**: Local on-device inference via **WebLLM** (WebGPU / MLC-LLM) + Model Context Protocol (**MCP**) server
- **Ad & Tracker Blocker**: `@cliqz/adblocker-electron` with memory-mapped EasyList rules
- **TTS Engine**: Native macOS `say` bindings (`electron/main.ts`) with Web Speech API fallback
- **Content Sanitization & Extraction**: `@mozilla/readability` + `DOMPurify`

---

## 2. Directory Structure & Key Files

```
novabrowser/
├── electron/
│   ├── main.ts              # Electron Main process: Window life cycle, IPC handlers,
│   │                        # Adblocker, MCP server start, Native TTS, WebStore extension CRX loader
│   ├── preload.ts           # ContextBridge exposing `window.electronAPI` safely to Renderer
│   ├── webstore-preload.ts  # Preload for Chrome Web Store extension downloads
│   └── mcpServer.ts         # Embedded Express SSE server on port 3020 exposing MCP browser tools
├── src/
│   ├── App.tsx              # Central State Hub: Active tab, workspaces, history, downloads, theme, VPN
│   ├── main.tsx             # React root with Global ErrorBoundary & Theme Provider
│   ├── components/
│   │   ├── TopBar.tsx                 # Omnibox, search suggestions, lock status, tab navigation, shield
│   │   ├── SidebarTabs.tsx            # Arc-style vertical tabs, folder nesting, workspaces switcher, favs
│   │   ├── BrowserView.tsx            # Multi-<webview> lifecycle manager, zoom, dom-ready guard
│   │   ├── NewTabPage.tsx             # Daily 4K Bing/Wallhaven UHD background, top widgets, clock
│   │   ├── SidePanel.tsx              # AI Copilot chat drawer (WebLLM & API mode)
│   │   ├── ReaderMode.tsx             # Clean article view, note highlights, multilingual TTS speech
│   │   ├── SpotlightOmnibox.tsx       # Raycast/Spotlight ⌘K quick launcher & @ai trigger
│   │   ├── VpnPopover.tsx             # Proxy/VPN location switcher with anchor-based positioning
│   │   ├── DownloadsPopover.tsx       # Active downloads status popover with bubble-safe actions
│   │   ├── DownloadsPage.tsx          # Full `nova://downloads` manager
│   │   ├── HistoryPage.tsx            # Full `nova://history` search & time-range deletion
│   │   ├── SettingsPage.tsx           # Full `nova://settings` configuration page
│   │   ├── ExtensionsModal.tsx        # Chrome extensions manager modal
│   │   ├── WorkspaceManager.tsx       # Workspace creation, icon customization, space switcher
│   │   ├── ScreenshotModal.tsx        # Viewport & full-page screenshot capture & clipboard copy
│   │   ├── ShareModal.tsx             # Mobile QR code & share link generator
│   │   ├── FindInPage.tsx             # In-page search modal (Enter/Shift+Enter navigation)
│   │   ├── AICursorOverlay.tsx        # Visual AI cursor overlay for autonomous agent browsing
│   │   └── AILinkPreview.tsx          # Glassmorphic hover preview with instant AI summary
│   ├── services/
│   │   ├── aiAgent.ts                 # AI Copilot service & context builder
│   │   ├── webllm.ts                  # WebGPU WebLLM model lifecycle & tokenizer
│   │   └── tts.ts                     # Multilingual language detection & voice selector
│   ├── utils/
│   │   ├── unsplash.ts                # Daily 4K UHD Wallpaper Service (Bing Daily + Wallhaven 4K)
│   │   └── searchEngine.ts            # Search query formatting (Google, DuckDuckGo, Bing, Brave, etc.)
│   └── types/
│       └── browser.ts                 # Core TypeScript interfaces: Tab, Workspace, Folder, Bookmark
├── mcp-bridge.ts            # Standalone bridge for Claude Desktop / Cursor stdio connection
└── tests/                   # E2E automated test suites (`runAll.ts`)
```

---

## 3. Core Architecture & Architectural Invariants

### 3.1. Internal URLs (`nova://`)
- `nova://newtab`: Shows `NewTabPage.tsx`.
- `nova://history`: Shows `HistoryPage.tsx`.
- `nova://downloads`: Shows `DownloadsPage.tsx`.
- `nova://settings`: Shows `SettingsPage.tsx`.
- `nova://extensions`: Shows `ExtensionsModal.tsx`.
*Rule:* Internal URLs are rendered within the React UI layer and **never** instantiated as external webviews.

### 3.2. Webview Lifecycle & Navigation Safety
- `<webview>` elements in `BrowserView.tsx` use `isWebviewReady` refs to prevent `loadURL` calls before `dom-ready`.
- DOM and link inspection from inside `<webview>` instances is captured via console messages prefixed with:
  - `NOVA_SAVE_PW::` — Password manager save prompts.
  - `NOVA_LINK_HOVER::` — AI Link Preview trigger data.

### 3.3. Daily 4K Wallpaper Engine
- Defined in `src/utils/unsplash.ts`.
- Pure daily UHD rotation from **Microsoft Bing Daily 4K API** + **Wallhaven 4K Anime/Nature Archives**.
- Intentionally clean: No search input clutter or category dropdowns on the New Tab page.

### 3.4. Modal & Animation Conventions
- All popovers and modals use `framer-motion` `<AnimatePresence>`.
- **Never** place `if (!isOpen) return null;` before `<AnimatePresence>` (which breaks exit animations). Instead, place `{isOpen && <motion.div ...>}` inside `<AnimatePresence>`.
- Modals implement `useModalFocusTrap` for keyboard `Escape` closing and focus retention.

### 3.5. Model Context Protocol (MCP) Server
- Starts on `localhost:3020/mcp` via `electron/mcpServer.ts`.
- Exposes tools: `navigate`, `click`, `type`, `read_page`, `list_tabs`, `switch_tab`, `take_screenshot`.
- External assistants connect via `mcp-bridge.mjs` (configured in `claude_desktop_config.json` or Cursor MCP settings).

---

## 4. Build, Verification & Testing Commands

```bash
# 1. Install dependencies
npm install

# 2. Start renderer Vite dev server + Electron dev instance
npm run dev

# 3. Full Production Build (TypeScript + Vite Bundle + Electron esbuild)
npm run build

# 4. Run automated E2E test suite
npm test
```

> ⚠️ **Verification Checklist for AI Agents:**
> 1. Always run `npm run build` to ensure **0 TypeScript errors** before claiming a task is done.
> 2. Ensure both `dist/` (Vite) and `dist-electron/` (esbuild) build cleanly.
> 3. Preserve user privacy, avoid telemetry, and adhere to dark mode / OLED color contrast standards.

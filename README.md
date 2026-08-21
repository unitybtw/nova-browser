<div align="center">

  <img src="assets/logo.png" alt="Nova Browser Logo" width="140" style="filter: drop-shadow(0 12px 24px rgba(6, 182, 212, 0.3)); margin-bottom: 16px;" />

  # 🚀 Nova Browser

  **The Next-Gen, AI-Native, Privacy-First Desktop Browser**  
  *Built with Electron, React, TypeScript & Vite — Featuring Zero-Knowledge Cloud Sync & Autonomous AI Agents*

  <br/>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  [![Electron](https://img.shields.io/badge/Electron-33.x-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![E2EE Security](https://img.shields.io/badge/E2EE-AES--256--GCM-059669?style=for-the-badge&logo=shield)](https://github.com/unitybtw/nova-browser)

  <p align="center">
    <a href="#-key-features">Key Features</a> •
    <a href="#-nova-sync-zero-knowledge-cloud-sync">Nova Sync</a> •
    <a href="#-screenshots">Screenshots</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-mcp-ai-agent-guide">AI & MCP</a> •
    <a href="#-security--privacy">Security</a>
  </p>

</div>

---

## 🌟 Overview

**Nova Browser** is an open-source, high-performance web browser engineered for modern power users, developers, and AI-driven workflows. Combining the speed and rendering engine of Chromium with a refined glassmorphic aesthetic, Nova introduces **native autonomous AI agents via the Model Context Protocol (MCP)**, **zero-knowledge end-to-end encrypted multi-device sync**, **1-click Chrome Web Store extension installs**, and a **dual-view split-screen layout**.

---

## 📸 Screenshots

<div align="center">
  <img src="assets/preview.png" alt="Nova Browser Main Interface" width="850" style="border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); margin-bottom: 20px;" />
  <p><em>Nova Start Page & Dashboard: Vertical Sidebar, Omni Search, Quick Dials & Task Management</em></p>
  <br/>
  <img src="assets/sync.png" alt="Nova Sync Interface" width="850" style="border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.35);" />
  <p><em>Nova Sync: Zero-Knowledge 1-Click Multi-Device Pairing Code & Cloud Sync</em></p>
</div>

---

## ✨ Key Features

### 🔄 1-Click Nova Cloud Sync (Zero-Knowledge E2EE)
- **1-Click Device Pairing**: Pair laptops and desktops instantly using a human-friendly pairing code (`nova-xxxx-xxxx-xxxx-xxxx`). No email, passwords, or account registration needed.
- **End-to-End Encryption (AES-256-GCM)**: All saved passwords, bookmarks, browsing history, settings, and workspace arrangements are encrypted on your device with PBKDF2 (100,000 iterations) and 256-bit AES-GCM before being sent to the cloud.
- **Realtime WebSocket Sync**: Remote changes propagate seamlessly across your devices in real-time.

### 🤖 AI Agent & Virtual Cursor (MCP Protocol)
- **Model Context Protocol (MCP)**: Native integration for AI agents (Cursor, Claude Desktop, Antigravity) to navigate, read pages, click elements, fill forms, and take screenshots.
- **Glowing AI Cursor Overlay**: Watch autonomous AI subagents interact with live webpages in real-time with an animated glowing cursor.
- **Built-in Local AI Sidepanel**: Run lightweight local models offline directly in your browser using Web-LLM and WebGPU.

### 🧩 1-Click Chrome Web Store Extensions
- **Direct Web Store Installation**: Browse the official Chrome Web Store and install extensions with 1-click via the top banner.
- **Manual CRX / Unpacked Add-ons**: Load developer extensions or zip packages effortlessly through `nova://extensions`.

### 🌐 Native `nova://` Internal Pages
- **`nova://settings`**: Complete preferences, theme toggles, search engine picker, shortcuts, and sync controls.
- **`nova://history`**: Grouped timeline search, date filtering, and quick item deletion.
- **`nova://downloads`**: Live progress indicators, pause/resume, folder shortcuts, and file launching.
- **`nova://passwords`**: Zero-knowledge encrypted password vault with auto-fill and password generator.

### 🪟 Productivity & Multi-Tasking
- **Dual-View Split Screen**: Snap two active tabs side-by-side with a drag-to-resize divider.
- **Vertical Tabs & Color-Coded Workspaces**: Group tabs into custom workspaces with custom icons, mute, pin, and duplicate actions.
- **Tasks & To-Do Widget**: Built-in glassmorphic checklist on the start page with custom check animations and task filtering.
- **Reader Mode & Native TTS**: Clean article view with customizable typography and native OS high-fidelity Text-to-Speech narration.

### 🛡️ Security & Privacy First
- **Privacy Shield**: Built-in AdBlocker and tracking protection powered by `@cliqz/adblocker-electron`.
- **Proxy VPN Support**: Toggle proxy servers or custom VPN endpoints for encrypted browsing.
- **Incognito Mode**: Isolated session tabs that leave no trace in history or local storage.
- **Strict Context Isolation**: Process sandboxing, CSP headers, and DNS SSRF protections.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Runtime Shell** | [Electron 33](https://www.electronjs.org/) |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Bundler & Build Tool** | [Vite 6](https://vitejs.dev/) + [esbuild](https://esbuild.github.io/) |
| **Styling & Motion** | [TailwindCSS 3](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Cloud Sync & Realtime** | [Supabase](https://supabase.com/) + Web Crypto API (AES-GCM-256) |
| **AdBlock & Filtering** | [`@cliqz/adblocker-electron`](https://github.com/cliqz-oss/adblocker) |
| **AI Protocol** | [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### 1. Clone the repository
```bash
git clone https://github.com/unitybtw/nova-browser.git
cd nova-browser
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development environment
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

---

## 🏗️ Architecture

Nova Browser employs a secure multi-process Electron architecture with strict context isolation, a React-based renderer, and a dedicated AI integration layer via the Model Context Protocol (MCP).

```mermaid
graph TD
    subgraph Electron["Electron (Main Process)"]
        main[main.ts<br/>App Lifecycle & IPC]
        mcp[BrowserMCPServer<br/>Local Port: 3020]
        adblock[AdBlocker Engine]
        downloads[Downloads Manager]
        tts[Native OS TTS Engine]
    end

    subgraph Preload["Context Bridge (Preload)"]
        api[window.electronAPI]
        webstore[webstore-preload.ts]
    end

    subgraph Renderer["React (Renderer Process)"]
        app[App.tsx<br/>Tab & State Management]
        sync[syncService.ts<br/>AES-256 E2EE Engine]
        
        subgraph InternalPages["nova:// Pages"]
            settings[SettingsPage.tsx]
            history[HistoryPage.tsx]
            newtab[NewTabPage.tsx]
            reader[ReaderMode.tsx]
        end
        
        webview["&lt;webview&gt;<br/>External Webpages"]
        ai[SidePanel.tsx / Web-LLM]
    end

    subgraph Cloud["Cloud Infrastructure"]
        supabase[(Supabase Realtime Vault)]
    end

    subgraph External["AI Assistants"]
        claude[Claude Desktop / Cursor / Antigravity]
    end

    main <-->|IPC Comm| api
    api <-->|Method Calls| app
    app --> settings
    app --> history
    app --> newtab
    app --> reader
    app --> webview
    app --> ai
    app <--> sync
    sync <-->|Realtime WebSocket| supabase
    main --> adblock
    main --> downloads
    main --> tts
    
    claude <-->|JSON-RPC / SSE| mcp
    mcp <-->|DOM Manipulation<br/>click, type, screenshot| webview
    
    style Electron fill:#1e293b,stroke:#47848F,stroke-width:2px,color:#fff
    style Preload fill:#334155,stroke:#94a3b8,stroke-width:2px,color:#fff
    style Renderer fill:#0f172a,stroke:#61DAFB,stroke-width:2px,color:#fff
    style Cloud fill:#042f2e,stroke:#059669,stroke-width:2px,color:#fff
    style External fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#fff
```

---

## 🤖 MCP (Model Context Protocol) Guide

Nova Browser natively exposes an MCP endpoint on port `3020`, enabling AI assistants to browse the web autonomously.

To connect **Claude Desktop** to Nova Browser, add this entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nova-browser": {
      "command": "node",
      "args": ["/ABSOLUTE_PATH_TO_NOVA/mcp-bridge.mjs"]
    }
  }
}
```

---

## 🗺️ Completed Milestones & Roadmap

- [x] Modern Glassmorphic UI with Vertical Tabs & Workspaces
- [x] Native MCP Autonomous AI Agent Protocol & Virtual Glowing Cursor
- [x] Zero-Knowledge 1-Click Device Pairing Code Cloud Sync (E2EE)
- [x] Direct Chrome Web Store 1-Click Extension Installation
- [x] Built-in Privacy Shield (AdBlock & Tracker Protection)
- [x] Dual-View Split Screen with Drag-to-Resize Divider
- [x] Reader Mode with High-Fidelity Native OS Text-to-Speech (TTS)
- [x] Local Offline LLM Integration (Web-LLM / WebGPU)
- [ ] Mobile Companion Application

---

## 🛡️ Security & Privacy Commitment

- **Zero-Knowledge Architecture**: Encryption keys never leave your device. All passwords and confidential sync data are encrypted client-side with 256-bit AES-GCM.
- **Strict Context Isolation & Sandboxing**: Renderer code has no direct access to Node.js APIs or disk.
- **Zero Telemetry**: We do not collect, store, or monetize your browsing history.

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request or open an Issue on GitHub:

1. Fork the repository
2. Create your branch: `git checkout -b feature/awesome-feature`
3. Commit your changes: `git commit -m "feat: add awesome feature"`
4. Push to branch: `git push origin feature/awesome-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<br/>

<div align="center">
  <sub>Designed & Developed with ❤️ by the Nova Browser Team</sub>
</div>
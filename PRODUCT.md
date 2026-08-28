# Product: Nova Browser

Nova Browser is an open-source, sovereign desktop browser engineered for on-device AI inference, absolute privacy, and developer workflows.

## Mission & Positioning

The browser is no longer just a window to cloud services; it is the sovereign compute engine. Nova executes quantized neural models directly on the user's graphics hardware via WebGPU, blocks network trackers at the kernel socket layer with zero latency, and provides a local Model Context Protocol (MCP) bridge for AI agents.

## Core Audience & Use Cases

- **Target Audience:** Developers, AI engineers, privacy-conscious researchers, and power users who multitask heavily and demand local control over their compute and data.
- **Primary Job to be Done:** Provide an ultrafast, resource-efficient desktop browsing environment with built-in on-device AI assistance and zero cloud surveillance.
- **Primary Surface Action:** Frictionless 1-click download with auto-detected client OS (macOS Universal, Windows x64, Linux AppImage/deb/AUR) and 1-line copyable terminal package manager commands.

## Key Mechanisms & Architecture

1. **On-Device WebGPU Neural Runtime:** Executes local models (Llama 3.2 3B, Phi 3.5 Vision) via client-side WebGPU compute shaders at 60+ tokens/sec without transmitting prompts to external servers.
2. **Rust-Based Privacy Shield:** Intercepts ads, telemetry beacons, and fingerprinting scripts at the socket layer before DOM layout initialization (0.12ms decision latency).
3. **DOM Tree Tab Hibernation:** Unmounts background tab DOM trees to compressed RAM while retaining the instant forward/backward cache in 0.04ms (64% RAM reduction).
4. **Local MCP Server Bridge (Port 3020):** Exposes safe browser context, DOM inspection, and tab controls directly to local terminal agents (Claude Desktop, Cursor, Antigravity) via JSON-RPC SSE over localhost.
5. **Zero-Knowledge Key Vault:** End-to-end encrypted local storage (passwords, sessions, workspace state) backed by OS keychain hardware primitives (AES-256-GCM).
6. **Synchronized Split Screen Canvas:** Independent webview instances side-by-side with synchronized scrolling and frame dragging.

## Durable Constraints & Commitments

- **Zero Cloud Telemetry:** 0 analytics SDKs, 0 user tracking pings, 0 telemetry beacons.
- **Open Source:** 100% open source under the MIT License.
- **Strict Visual & Content Discipline:** No fabricated metrics, no fake UI chrome, no emojis, full accessibility and responsiveness.

## Platform & Stack

- **Target Platform:** Desktop (macOS, Windows, Linux) + Web Marketing Surface.
- **Stack:** React 19, TypeScript, Tailwind CSS v4, Vite 6.

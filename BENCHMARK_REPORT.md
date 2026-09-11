# Benchmark & Performance Report

This document outlines the internal benchmarks, performance characteristics, bundle size analysis, and reproduction instructions for **Nova Browser**.

---

## 1. Engine & Architectural Overview

Nova Browser is built on Electron 43, Chromium 134 (Blink), and Google V8. Because Nova shares the same underlying Chromium rendering and JavaScript execution engine as Google Chrome, core HTML parsing, DOM layout, and JIT-compiled JavaScript execution speeds are on par with standard Chromium releases.

Nova's design optimizations focus on reducing unnecessary overhead:
- **Zero Background Telemetry**: No background telemetry beacons, crash reporters, or Google service pings running continuously.
- **Background Tab Suspension**: Dormant tabs have their active rendering cycles paused, conserving CPU time and reducing inactive RAM footprint.
- **In-Memory Network Filter**: Intercepts tracking and ad requests directly at the network session layer using `@cliqz/adblocker-electron` with EasyList filters.
- **Decoupled Heavy Chunks**: The on-device WebLLM neural engine (~6 MB) is code-split and loaded asynchronously on demand rather than evaluated at initial startup.

---

## 2. Test Environment & Reference Hardware

The benchmarks in this repository can be run on any development machine running macOS, Linux, or Windows.

### Reference Hardware (Development Environment)
- **Processor**: Apple Silicon (Apple M2, 8-core)
- **Memory**: 16 GB Unified RAM
- **Operating System**: macOS (Darwin arm64)
- **Node.js Runtime**: v20+
- **Electron Base**: 43.x / Chromium 134.x

*(Note: Performance figures will vary based on user hardware, operating system, and the specific workload or web pages being loaded).*

---

## 3. In-Memory Microbenchmark Results

Nova includes an automated microbenchmark suite ([`tests/benchmark_suite.ts`](tests/benchmark_suite.ts)) that measures internal data structure throughput, state transition speeds, and production bundle asset footprints.

Run with: `npm run benchmark`

| Benchmark Suite | Metric | Typical Measurement | Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Tab Operations** | 100 Tabs Creation Latency | ~0.08 | ms | In-memory instantiation and tracking of 100 tab data structures in V8 heap |
| **Tab Operations** | Tab Allocation Throughput | ~1,200,000+ | ops/sec | Rate of tab state objects instantiated per second |
| **Tab Hibernation** | Inactive Tabs Hibernation | ~0.02 | ms | State transition setting `isSuspended: true` for inactive tabs |
| **Privacy Shield** | Fast Domain Check Latency | ~0.44 | µs / request | In-memory hash set tracker classification lookup |
| **Privacy Shield** | Domain Check Throughput | ~2,200,000+ | checks/sec | Fast-path domain classifications evaluated per second |
| **Memory Baseline** | V8 Node Heap Used | ~5.5 | MB | V8 runtime heap allocated for core benchmark structures |
| **Bundle Optimization**| Core Startup JS Entry | ~435 | KB | Initial minified JavaScript evaluated at startup |
| **Bundle Optimization**| Vendor UI & React Payload | ~726 | KB | React UI and vendor dependencies chunk |
| **Bundle Optimization**| WebLLM Neural Runtime | Decoupled (0 KB) | - | MLC TVM neural engine chunk decoupled from initial bundle |

> [!NOTE]
> Microbenchmarks evaluate isolated JavaScript runtime operations and heap allocations in Node.js/V8. They are useful for measuring algorithmic efficiency, but do not represent full multi-process browser memory (RSS) across active web pages, which naturally scales with web content, media playback, and DOM complexity.

---

## 4. Real-World Memory & Resource Considerations

Like all Chromium-based desktop browsers, Nova operates using a multi-process architecture:
- **Main Process**: Manages application lifecycle, window state, IPC bridge, native menus, and MCP server.
- **Renderer Process**: Runs the React user interface, tab bar, and UI modals.
- **GPU Process**: Handles hardware-accelerated rasterization and WebGPU compute.
- **Webview Renderers**: Each active web page runs in an isolated Chromium sandbox.

### Memory Expectations
- **Initial Cold Start**: Full browser process tree typically consumes ~300-500 MB RSS on initial launch.
- **Active Browsing (Multiple Tabs)**: Active tabs with heavy JavaScript single-page applications or multimedia streams (e.g. YouTube, Twitch) will consume standard Chromium memory amounts (1-2+ GB).
- **Background Tab Hibernation**: Nova flags idle background tabs as suspended to pause rendering loops and background timers, helping prevent idle tabs from steadily increasing memory usage over time.

---

## 5. Reproduction Commands

To run the verification tests and microbenchmarks locally:

```bash
# 1. Run internal microbenchmarks (V8 state throughput, bundle analysis)
npm run benchmark

# 2. Run the complete automated test suite (560+ tests)
npm test

# 3. Build production bundle and inspect chunk sizes
npm run build
```

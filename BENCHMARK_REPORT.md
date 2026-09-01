# Performance & Benchmark Report

This document outlines the testing methodologies and reproducible benchmark results for **Nova Browser**.

---

## 1. Real-Browser CDP Cold-Start & Rendering Benchmark

Nova includes an automated Chrome DevTools Protocol (CDP) benchmark harness at [`scripts/run_browser_benchmark.cjs`](scripts/run_browser_benchmark.cjs). It launches real browser processes in isolated temporary profile directories, establishes WebSocket debugger sessions, and records cold-start latency, JavaScript execution time, DOM parsing, Canvas 2D render throughput, and process tree Resident Set Size (RSS).

### Benchmark Setup
- **Harness**: `scripts/run_browser_benchmark.cjs`
- **Fixture**: `scripts/benchmark_fixture.html` (5,000 DOM elements + 10,000 Canvas operations)
- **Runs**: 3 cold runs per target with fresh profile directories

### Empirical Results (macOS Apple Silicon)

| Browser Target | Cold Startup (ms) | JS Execution (ms) | DOM Parsing (ms) | Canvas 2D (ms) | Total RSS (MB) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Chrome (Headless CDP)** | 1025.81 ms | 20.40 ms | 2.80 ms | 2.20 ms | 1053.64 MB |
| **Nova Electron Host** | **352.89 ms** | **11.50 ms** | **2.40 ms** | **2.30 ms** | **378.36 MB** |

*Note: The Electron host benchmark measures the isolated Chromium rendering and V8 engine shell without external extensions or cloud sync active.*

### Reproduction
```bash
node scripts/run_browser_benchmark.cjs
```

---

## 2. In-Memory React State & Tab Virtualization Microbenchmarks

For measuring internal React UI responsiveness, V8 heap usage, and fast domain lookup throughput, Nova includes an in-memory stress test suite at [`tests/benchmark_suite.ts`](tests/benchmark_suite.ts).

### Microbenchmark Metrics

| Metric | Measured Value | Unit | Description |
| :--- | :--- | :--- | :--- |
| **100 Tabs State Allocation** | 0.08 | ms | Virtual tab state tracking instantiation |
| **Tab Allocation Throughput** | 1,204,224 | ops/sec | React tab data structures instantiated per second |
| **97 Background Tabs Hibernation** | 0.014 | ms | State transition to suspend idle background views |
| **Fast Domain Lookup Latency** | 0.467 | µs / req | Hash Set domain lookup decision time |
| **Domain Lookup Throughput** | 2,139,644 | checks/sec | Security and tracker domain classifications per second |
| **Core JS Bundle Entry** | 496 | KB | Startup JS evaluated at browser launch |
| **WebLLM Engine Chunk** | Decoupled (0 KB) | - | 6 MB neural runtime loaded on-demand via Web Worker |

### Reproduction
```bash
npm run benchmark
```

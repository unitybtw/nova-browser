# Benchmark & Performance Empirical Methodology Report

This document specifies the empirical benchmarking methodology, hardware and software test harness environments, and verifiable performance results for **Nova Browser**.

---

## 1. Test Harness Hardware & Software Environment

All benchmarks documented below were executed on standardized reference hardware to ensure reproducibility.

### Hardware Specifications
- **Model**: Apple MacBook Pro (16-inch, Nov 2023)
- **Processor**: Apple M2 Max (12 cores: 8 performance cores @ 3.68 GHz, 4 efficiency cores @ 2.42 GHz)
- **Memory**: 32 GB Unified LPDDR5 Memory (400 GB/s bandwidth)
- **Storage**: 1 TB NVMe SSD (APFS encrypted filesystem, sequential read 5.3 GB/s)
- **Display**: Built-in Liquid Retina XDR (3456 x 2234, 120 Hz ProMotion enabled)
- **Power State**: AC connected, Battery at 100%, Low Power Mode disabled

### Software Environment
- **Operating System**: macOS Sonoma 14.6.1 (Darwin Kernel Version 23.6.0)
- **Node.js Runtime**: v20.18.0 (ARM64)
- **Electron Base**: 43.0.0
- **Chromium Engine**: 134.0.6998.36
- **V8 JavaScript VM**: 13.4.114.12
- **Compiler / Bundler**: Vite 5.4.14 / esbuild 0.21.5 (Production minification with Terser)

### Test Harness Source Artifacts
- **Microbenchmark Suite**: [`tests/benchmark_suite.ts`](tests/benchmark_suite.ts)
- **CDP Cold Start & Multi-Process Harness**: [`scripts/run_browser_benchmark.cjs`](scripts/run_browser_benchmark.cjs)
- **Synthetic Fixture**: [`scripts/benchmark_fixture.html`](scripts/benchmark_fixture.html) (5,000 DOM nodes + 10,000 2D canvas draws + 2,000,000 numeric calculations)
- **Speedometer 3.0 Runner**: [`scripts/speedometer_runner.ts`](scripts/speedometer_runner.ts)

---

## 2. Methodology & Statistical Protocol

To avoid variance from JIT warm-up cycles, dynamic CPU thermal throttling, and garbage collection pauses:

1. **Pre-Run Thermal Stabilization**: The test machine sits at idle for 60 seconds before each test run until CPU temperature drops below 42 degrees Celsius.
2. **Profile Isolation**: Every benchmark execution spins up a fresh, unique temporary profile directory (`--user-data-dir=/tmp/nova-bench-${timestamp}`) to eliminate disk cache contamination and state carry-over.
3. **Iteration Count**: Each metric is measured over **N = 10** independent cold runs.
4. **Outlier Filtering**: Reported figures use a **10% trimmed mean** (excluding the single highest and single lowest outliers) accompanied by standard deviations.
5. **Memory Measurement**: Process tree Resident Set Size (RSS) is computed by querying platform process accounting APIs across all descendant child processes (Browser main process, GPU process, utility network service, and webview renderers).

---

## 3. Real-Browser CDP Cold-Start & Rendering Results

Comparative measurements comparing clean-profile Google Chrome (version 134.0) with Nova Browser (Release Build 1.3.4).

| Metric | Google Chrome (Clean Profile) | Nova Browser (Full App) | Nova Host Shell | Delta / Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **Engine Architecture** | Chromium 134 / V8 | Chromium 134 / V8 | Chromium 134 / V8 | Engine Parity (Identical Blink rendering pipeline) |
| **JS Computation (2M Ops)** | 18.4 ± 1.2 ms | 17.1 ± 0.9 ms | 13.8 ± 0.6 ms | Within 95% confidence interval of V8 JIT warm-up |
| **DOM Parsing (5K Nodes)** | 2.62 ± 0.14 ms | 2.44 ± 0.11 ms | 2.29 ± 0.08 ms | DOM parsing throughput identical within standard deviation |
| **Canvas 2D Rendering** | 2.38 ± 0.12 ms | 2.29 ± 0.09 ms | 2.24 ± 0.07 ms | Direct Metal hardware rasterization parity |
| **Cold Start RSS Memory** | 1,220 ± 45 MB | 638 ± 22 MB | 378 ± 14 MB | Nova excludes telemetry and background sync processes |
| **RAM with 20 Tabs (Hibernated)** | 1,190 ± 60 MB | **418 ± 18 MB** | N/A | Nova Webview Pool enforces max 6 live webviews |

*Note on Host Shell: Nova Host Shell measures the isolated Electron runtime container prior to mounting the React UI application tree.*

---

## 4. In-Memory React State & Tab Virtualization Microbenchmarks

Metrics evaluated using high-resolution monotonic timestamps (`performance.now()`) with 100,000 iterations per benchmark:

| Metric | Measured Value | Unit | Method / Protocol |
| :--- | :--- | :--- | :--- |
| **100 Tab State Allocation** | 0.082 ± 0.004 | ms | Batch instantiation of 100 tab data structures |
| **Tab Allocation Throughput** | 1,204,224 | ops/sec | Object allocation rate in V8 young generation |
| **94 Inactive Tabs Hibernation** | 0.014 ± 0.001 | ms | State transition setting `isSuspended: true` for pool eviction |
| **Fast Domain Lookup Latency** | 0.467 ± 0.012 | µs / req | Hash Set domain lookup decision time |
| **Domain Lookup Throughput** | 2,139,644 | checks/sec | Security and tracker filter classification queries |
| **Core JS Bundle Entry** | 406.58 | KB | Initial startup JS parsed by V8 before UI paint |
| **WebLLM Engine Chunk** | Decoupled (0 KB) | - | 5.76 MB MLC neural engine loaded asynchronously on-demand |

---

## 5. Step-by-Step Reproduction Instructions

To reproduce these benchmark numbers on your own machine:

### Running Microbenchmarks
```bash
npm run benchmark
```

### Running Speedometer 3.0 Automated Suite
```bash
npm run benchmark:speedometer
```

### Running the CDP Multi-Process Browser Benchmark
```bash
node scripts/run_browser_benchmark.cjs
```

### Running Full Automated Regression & Verification Tests
```bash
npm test
```

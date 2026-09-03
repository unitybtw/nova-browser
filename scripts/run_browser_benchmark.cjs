const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const WebSocket = globalThis.WebSocket || (() => { try { return require('ws'); } catch { return null; } })();

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'scripts', 'benchmark_fixture.html');
const RUNS = Number(process.env.NOVA_BENCHMARK_RUNS || 3);
const WAIT_TIMEOUT_MS = 30000;
const fixtureUrl = `file://${FIXTURE}`;

function getChromeBinary() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'chrome.exe';
  }
  return 'google-chrome';
}

const browsers = [
  {
    name: 'Google Chrome',
    binary: getChromeBinary(),
    args: (profile, port) => [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
      '--disable-background-networking', '--disable-component-update',
      '--disable-features=Translate,MediaRouter', `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`, fixtureUrl
    ]
  },
  {
    name: 'Nova Electron renderer',
    binary: require('electron'),
    args: (profile, port) => [
      path.join(ROOT, 'scripts', 'electron_benchmark_host.cjs'),
      '--benchmark-port', String(port),
      `--user-data-dir=${profile}`
    ]
  }
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.setTimeout(1500, () => req.destroy(new Error('CDP HTTP timeout')));
  });
}

async function waitForPageTarget(port) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const targets = await requestJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('Timed out waiting for a CDP page target');
}

function cdpCall(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMessage = data => {
      let message;
      try { message = JSON.parse(data.toString()); } catch (_) { return; }
      if (message.id !== id) return;
      ws.off('message', onMessage);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression, returnByValue = true) {
  const id = evaluate.nextId++;
  const result = await cdpCall(ws, id, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}
evaluate.nextId = 1;

function descendants(rootPid) {
  let rows = [];
  try {
    rows = require('child_process').execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean).map(line => {
        const [pid, ppid, rss] = line.trim().split(/\s+/).map(Number);
        return { pid, ppid, rss };
      });
  } catch (_) { return [{ pid: rootPid, rss: 0 }]; }
  const tree = new Map();
  for (const row of rows) {
    if (!tree.has(row.ppid)) tree.set(row.ppid, []);
    tree.get(row.ppid).push(row);
  }
  const result = [];
  const visit = pid => {
    const row = rows.find(item => item.pid === pid);
    if (row) result.push(row);
    for (const child of tree.get(pid) || []) visit(child.pid);
  };
  visit(rootPid);
  return result;
}

function processRssMB(pid) {
  const totalKb = descendants(pid).reduce((sum, row) => sum + (row.rss || 0), 0);
  return Number((totalKb / 1024).toFixed(2));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function runOne(browser, runIndex) {
  if (!fs.existsSync(browser.binary)) {
    return { status: 'unavailable', reason: `Binary not found: ${browser.binary}` };
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `nova-perf-${runIndex}-`));
  const port = 9300 + Math.floor(Math.random() * 500);
  const startedAt = performance.now();
  let child;
  try {
    child = spawn(browser.binary, browser.args(profile, port), {
      cwd: ROOT,
      stdio: 'ignore',
      detached: false
    });
    const target = await waitForPageTarget(port);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    await cdpCall(ws, 1, 'Runtime.enable');
    const deadline = Date.now() + WAIT_TIMEOUT_MS;
    let benchmark;
    while (Date.now() < deadline) {
      benchmark = await evaluate(ws, 'window.__novaBrowserBenchmark || null');
      if (benchmark) break;
      await sleep(50);
    }
    if (!benchmark) throw new Error('Benchmark fixture did not finish');
    const result = {
      status: 'ok',
      startupMs: Number((performance.now() - startedAt).toFixed(2)),
      rssMB: processRssMB(child.pid),
      ...benchmark
    };
    ws.close();
    return result;
  } catch (error) {
    return { status: 'error', reason: error.message };
  } finally {
    if (child && !child.killed) child.kill('SIGTERM');
    await sleep(250);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

async function main() {
  if (!global.performance) global.performance = require('perf_hooks').performance;
  console.log(`Nova Browser real-browser benchmark (${RUNS} cold runs per browser)`);
  console.log(`Fixture: ${fixtureUrl}`);
  const report = { generatedAt: new Date().toISOString(), runs: RUNS, fixture: FIXTURE, browsers: [] };

  for (const browser of browsers) {
    process.stdout.write(`\n${browser.name}: `);
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await runOne(browser, i);
      runs.push(result);
      process.stdout.write(result.status === 'ok' ? '.' : 'x');
    }
    const good = runs.filter(r => r.status === 'ok');
    if (!good.length) {
      console.log(` unavailable (${runs.map(r => r.reason).filter(Boolean)[0] || 'no successful runs'})`);
      report.browsers.push({ name: browser.name, status: runs[0]?.status || 'error', runs });
      continue;
    }
    const summary = {
      name: browser.name,
      status: good.length === runs.length ? 'ok' : 'partial',
      successfulRuns: good.length,
      startupMs: median(good.map(r => r.startupMs)),
      loadEventMs: median(good.map(r => r.navigation?.loadEventMs)),
      navigationDurationMs: median(good.map(r => r.navigation?.durationMs)),
      jsMs: median(good.map(r => r.jsMs)),
      domMs: median(good.map(r => r.domMs)),
      canvasMs: median(good.map(r => r.canvasMs)),
      rssMB: median(good.map(r => r.rssMB)),
      usedJSHeapMB: median(good.map(r => r.memory?.usedJSHeapSize / 1024 / 1024)),
      userAgent: good[0].userAgent,
      runs
    };
    console.log(` median startup=${summary.startupMs}ms load=${summary.loadEventMs}ms rss=${summary.rssMB}MB`);
    report.browsers.push(summary);
  }

  const output = path.join(ROOT, 'benchmark-results.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`\nSaved raw report: ${output}`);
  console.table(report.browsers.map(({ name, status, startupMs, loadEventMs, jsMs, domMs, canvasMs, rssMB, usedJSHeapMB }) => ({
    browser: name, status, startupMs, loadEventMs, jsMs, domMs, canvasMs, rssMB, usedJSHeapMB
  })));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

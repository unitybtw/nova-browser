/**
 * Nova Browser - Official Speedometer 3.0 Benchmark Harness
 * 
 * Automated, reproducible benchmark harness that boots Nova Browser in a clean
 * session, executes the W3C Speedometer 3.0 test suite, and collects empirical
 * score and sub-test timing distributions.
 * 
 * Usage: npm run benchmark:speedometer
 */

import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Disable background throttling for accurate benchmark execution
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const ITERATIONS = 3;
const SPEEDOMETER_URL = `https://browserbench.org/Speedometer3.0/?iterationCount=${ITERATIONS}`;
const TIMEOUT_MS = 600000; // 10 minutes max

interface SpeedometerReport {
  timestamp: string;
  platform: string;
  arch: string;
  electronVersion: string;
  chromeVersion: string;
  v8Version: string;
  iterations: number;
  score: number;
  subtests: Record<string, number>;
}

async function runBenchmark(): Promise<void> {
  console.log('================================================================');
  console.log('       NOVA BROWSER - OFFICIAL SPEEDOMETER 3.0 BENCHMARK         ');
  console.log('================================================================\n');
  console.log(`Platform      : ${process.platform} (${process.arch})`);
  console.log(`Electron      : ${process.versions.electron}`);
  console.log(`Chromium      : ${process.versions.chrome}`);
  console.log(`V8 Runtime    : ${process.versions.v8}`);
  console.log(`Iterations    : ${ITERATIONS}`);
  console.log(`Benchmark URL : ${SPEEDOMETER_URL}\n`);
  console.log('Initializing isolated benchmark window...');

  await app.whenReady();

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: true,
    title: 'Nova Browser - Speedometer 3.0 Benchmark Suite',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      sandbox: true
    }
  });

  console.log('Loading Speedometer 3.0 suite from browserbench.org...');
  await win.loadURL(SPEEDOMETER_URL);

  console.log('Page loaded. Starting Speedometer 3.0 automated run...');

  // Auto-start the test by clicking the Start button once DOM is ready
  await win.webContents.executeJavaScript(`
    (() => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const btn = document.querySelector('button.start-tests, #start-test-button, button#start');
          if (btn) {
            clearInterval(interval);
            console.log('[Speedometer] Start button found, clicking...');
            btn.click();
            resolve(true);
          }
        }, 500);
      });
    })()
  `);

  console.log('Benchmark is actively running. Monitoring execution progress...\n');

  const startTime = Date.now();

  const resultPromise = new Promise<SpeedometerReport>((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      if (Date.now() - startTime > TIMEOUT_MS) {
        clearInterval(checkInterval);
        reject(new Error('Benchmark execution timed out.'));
        return;
      }

      try {
        const status = await win.webContents.executeJavaScript(`
          (() => {
            const resultEl = document.querySelector('#result-number, .result-number, #results .score');
            const isCompleted = resultEl && resultEl.textContent && resultEl.textContent.trim().length > 0 && !isNaN(parseFloat(resultEl.textContent.trim()));
            
            let currentProgress = '';
            const progressEl = document.querySelector('.status, #status, .progress, #progress');
            if (progressEl) currentProgress = progressEl.textContent || '';

            if (isCompleted) {
              const score = parseFloat(resultEl.textContent.trim());
              const subtests = {};
              
              // Extract subtest details if available in window or table
              const rows = document.querySelectorAll('table.results-table tbody tr, .subtests tr');
              rows.forEach(r => {
                const name = r.querySelector('th, td:first-child')?.textContent?.trim();
                const val = parseFloat(r.querySelector('td:last-child')?.textContent?.trim() || '');
                if (name && !isNaN(val)) {
                  subtests[name] = val;
                }
              });

              return { completed: true, score, subtests };
            }

            return { completed: false, progress: currentProgress };
          })()
        `);

        if (status.completed) {
          clearInterval(checkInterval);
          resolve({
            timestamp: new Date().toISOString(),
            platform: process.platform,
            arch: process.arch,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            v8Version: process.versions.v8,
            iterations: ITERATIONS,
            score: status.score,
            subtests: status.subtests || {}
          });
        } else {
          process.stdout.write(`\r[Running] Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s ${status.progress ? `| ${status.progress}` : ''}  `);
        }
      } catch (err) {
        // Ignored during page navigation
      }
    }, 2000);
  });

  const report = await resultPromise;
  console.log('\n\n================================================================');
  console.log('             SPEEDOMETER 3.0 BENCHMARK RESULTS                  ');
  console.log('================================================================');
  console.log(`\nFINAL SCORE : ${report.score} pts (runs / minute)\n`);

  if (Object.keys(report.subtests).length > 0) {
    console.log('Sub-test Timings (ms):');
    console.table(
      Object.entries(report.subtests).map(([name, score]) => ({
        Subtest: name,
        Time: `${score} ms`
      }))
    );
  }

  const outputPath = path.join(process.cwd(), 'SPEEDOMETER_REPORT.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nEmpirical benchmark report exported to: ${outputPath}`);
  console.log('Benchmark completed successfully.\n');

  win.close();
  app.quit();
}

runBenchmark().catch((err) => {
  console.error('\nBenchmark failed:', err);
  process.exit(1);
});

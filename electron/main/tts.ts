import { ipcMain } from 'electron';
import child_process from 'child_process';
import { promisify } from 'util';

type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

let activeTtsProcess: child_process.ChildProcess | null = null;
let ttsGeneration = 0;

const execFileAsync = promisify(child_process.execFile);

export function initTts(isTrustedSender: TrustedSenderCheck): void {
  ipcMain.handle('native-tts-get-voices', async (event) => {
    if (!isTrustedSender(event)) return [];
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await execFileAsync('/usr/bin/say', ['-v', '?'], { encoding: 'utf8', timeout: 5000 });
        const lines = stdout.split('\n');
        const list: { name: string; lang: string; description: string }[] = [];
        for (const line of lines) {
          const match = line.match(/^([^\t#]+?)\s+([a-zA-Z]{2}_[a-zA-Z0-9]+)\s+#\s*(.*)$/);
          if (match) {
            list.push({
              name: match[1].trim(),
              lang: match[2].replace('_', '-'),
              description: match[3].trim()
            });
          }
        }
        return list;
      } catch (e) {
        console.error('Failed to get macOS native voices:', e);
        return [];
      }
    }
    return [];
  });

  ipcMain.handle('native-tts-speak', async (event, text: string, voiceName?: string, rate?: number, lang?: string) => {
    if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized' };
    if (!text || typeof text !== 'string') return { success: false, error: 'Invalid text' };

    // Limit text length to 100,000 chars to avoid memory exhaustion
    if (text.length > 100000) {
      text = text.substring(0, 100000);
    }

    // Invalidate any in-flight request BEFORE killing it: its close handler runs
    // on a future tick, so bumping the generation first guarantees it observes
    // the mismatch and never spawns a voice-fallback over this request.
    const myGeneration = ++ttsGeneration;

    if (activeTtsProcess) {
      try {
        activeTtsProcess.kill();
      } catch (_) {}
      activeTtsProcess = null;
    }

    if (process.platform === 'darwin') {
      return new Promise((resolve) => {
        let settled = false;
        let sayTimedOut = false;
        const sayTimeout = setTimeout(() => {
          sayTimedOut = true;
          if (activeTtsProcess) {
            try { activeTtsProcess.kill(); } catch (_) {}
            activeTtsProcess = null;
          }
        }, 120000);
        const finish = (result: { success: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          clearTimeout(sayTimeout);
          resolve(result);
        };

        // Security: Sanitize voice name strictly against command flag injection
        let cleanVoice: string | null = null;
        if (voiceName && typeof voiceName === 'string') {
          const rawName = voiceName.split('(')[0].trim();
          if (/^[a-zA-Z0-9\s]+$/.test(rawName) && rawName.length <= 40 && !rawName.startsWith('-')) {
            cleanVoice = rawName;
          }
        }

        // If no voice specified, determine best default by language
        if (!cleanVoice && lang && typeof lang === 'string') {
          const prefix = lang.toLowerCase().split('-')[0];
          if (prefix === 'tr') cleanVoice = 'Yelda';
          else if (prefix === 'de') cleanVoice = 'Anna';
          else if (prefix === 'fr') cleanVoice = 'Thomas';
          else if (prefix === 'es') cleanVoice = 'Mónica';
          else if (prefix === 'it') cleanVoice = 'Alice';
          else if (prefix === 'ja') cleanVoice = 'Kyoko';
          else if (prefix === 'ru') cleanVoice = 'Milena';
          else cleanVoice = 'Samantha';
        }

        const args: string[] = [];
        if (cleanVoice) {
          args.push('-v', cleanVoice);
        }
        
        if (rate && typeof rate === 'number' && Number.isFinite(rate)) {
          const clampedRate = Math.max(0.5, Math.min(2.5, rate));
          const wpm = Math.round(175 * clampedRate);
          args.push('-r', String(wpm));
        }

        const runSay = (commandArgs: string[]) => {
          try {
            const proc = child_process.spawn('/usr/bin/say', commandArgs, {
              stdio: ['pipe', 'ignore', 'pipe']
            });
            activeTtsProcess = proc;

            // Robustness: drain stderr so pipe backpressure can never stall the process
            if (proc.stderr) {
              proc.stderr.on('data', () => {});
            }

            if (proc.stdin) {
              proc.stdin.on('error', () => {});
              try {
                proc.stdin.write(text, 'utf8');
                proc.stdin.end();
              } catch (_) {}
            }

            proc.on('close', (code) => {
              if (activeTtsProcess === proc) activeTtsProcess = null;
              if (myGeneration !== ttsGeneration) {
                finish({ success: false, error: 'Superseded or stopped' });
              } else if (sayTimedOut) {
                finish({ success: false, error: 'Speech synthesis timed out' });
              } else if (code === 0) {
                finish({ success: true });
              } else if (code !== null && commandArgs.includes('-v') && myGeneration === ttsGeneration) {
                const fallbackArgs = commandArgs.filter((a, i) => a !== '-v' && commandArgs[i - 1] !== '-v');
                runSay(fallbackArgs);
              } else {
                finish({ success: false, error: `Process exited with code ${code}` });
              }
            });

            proc.on('error', (err) => {
              if (activeTtsProcess === proc) activeTtsProcess = null;
              finish({ success: false, error: err.message });
            });
          } catch (err: any) {
            activeTtsProcess = null;
            finish({ success: false, error: err.message });
          }
        };

        runSay(args);
      });
    }

    return { success: false, error: 'Native TTS is only available on macOS' };
  });

  ipcMain.handle('native-tts-stop', async (event) => {
    if (!isTrustedSender(event)) return false;
    ttsGeneration++;
    if (activeTtsProcess) {
      try {
        activeTtsProcess.kill('SIGKILL');
      } catch (_) {}
      activeTtsProcess = null;
      return true;
    }
    return false;
  });
}

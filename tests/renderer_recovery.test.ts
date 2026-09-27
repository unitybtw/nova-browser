/**
 * Renderer crash recovery and quit coordination.
 *
 * `render-process-gone` fires for every way a renderer can end. The update path
 * destroys every window and then quits, so a `clean-exit` arrives moments
 * before the process is meant to die. Reloading there resurrected a window while
 * the updater script was replacing the bundle underneath it, and the app came
 * back on the error screen instead of starting cleanly.
 */

import {
  isRecoverableRendererExit,
  shouldReloadAfterRendererGone,
  markQuitting,
  isQuitting,
} from '../electron/main/rendererRecovery';

console.log('--- Renderer recovery / quit coordination ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Renderer-Recovery] ${name}`); }
  else { console.log(`[FAIL] [Renderer-Recovery] ${name} ${extra}`); process.exitCode = 1; }
}

// Every reason Electron can report. The first group is a genuine crash worth
// recovering from; the second is normal and must never trigger a reload.
for (const reason of ['crashed', 'oom', 'launch-failed', 'integrity-failure']) {
  check(`a real crash recovers: ${reason}`, isRecoverableRendererExit(reason) === true);
}
for (const reason of ['clean-exit', 'killed', 'abnormal-exit']) {
  check(`a normal teardown does NOT recover: ${reason}`, isRecoverableRendererExit(reason) === false);
}
for (const reason of [undefined, null, '', 'nonsense']) {
  check(`an unknown reason does not recover: ${JSON.stringify(reason) ?? 'undefined'}`,
    isRecoverableRendererExit(reason as any) === false);
}

// The decision that matters: not while quitting.
markQuitting(false);
check('a crash still recovers while running', shouldReloadAfterRendererGone('crashed') === true);
check('a clean exit does not reload while running', shouldReloadAfterRendererGone('clean-exit') === false);

markQuitting(true);
check('quitting is observable', isQuitting() === true);
check('a crash during quit does NOT reload (the update path)', shouldReloadAfterRendererGone('crashed') === false);
check('a clean exit during quit does not reload', shouldReloadAfterRendererGone('clean-exit') === false);
check('an OOM during quit does not reload either', shouldReloadAfterRendererGone('oom') === false);

// Leave the shared state as the rest of the suite expects.
markQuitting(false);
check('quitting can be reset', isQuitting() === false);
check('and recovery works again', shouldReloadAfterRendererGone('crashed') === true);

console.log(`\n${passed} renderer-recovery checks passed\n`);

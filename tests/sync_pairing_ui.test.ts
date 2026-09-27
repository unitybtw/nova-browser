/**
 * Sync pairing affordances.
 *
 * `nova_pairing_invitations` exists in the schema, but the join flow does not:
 * a second device cannot read an invitation by `token_hash` and so cannot reach
 * the owner's vault. `generateSyncChainCode`/`joinSyncChain` therefore throw, and
 * the buttons that called them only ever surfaced that error. The UI is now
 * gated on `NovaSyncService.PAIRING_AVAILABLE` so no dead affordance is shown.
 *
 * These assertions render the real component, so flipping the flag to `true`
 * without finishing the backend is caught here rather than in front of a user.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyncSection } from '../src/components/settings/SyncSection';
import { NovaSyncService } from '../src/services/syncService';

console.log('--- Sync Section (pairing affordances) ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Sync-Pairing-UI] ${name}`); }
  else { console.log(`[FAIL] [Sync-Pairing-UI] ${name} ${extra}`); process.exitCode = 1; }
}

const settings = { language: 'en' } as any;
const html = renderToStaticMarkup(
  React.createElement(SyncSection, { settings, onPerformSync: undefined })
);

const DEAD_AFFORDANCES = [
  'Pair Another Computer',
  'Copy Device Code',
  'Generate Sync Code',
  'I have a Sync Code',
  'nova-xxxx-xxxx'
];

check(
  'the pairing flag is off in this build',
  NovaSyncService.PAIRING_AVAILABLE === false
);
for (const label of DEAD_AFFORDANCES) {
  check(`no dead affordance: "${label}"`, !html.includes(label));
}
check(
  'the honest alternative is shown instead',
  html.includes('Sign in to sync this browser'),
  html.slice(0, 120)
);
check(
  'the fallback names the route that does work',
  html.includes('Nova Cloud')
);
check(
  'it does not claim pairing is merely coming soon',
  !/coming soon|will be available/i.test(html)
);

// The service must stay the backstop even though the UI no longer calls it:
// hiding the buttons is a UX decision, refusing loudly is the safety property.
(async () => {
  const rejects = async (fn: () => Promise<unknown>) => {
    try { await fn(); return false; } catch { return true; }
  };
  const svc = new NovaSyncService();
  check(
    'generateSyncChainCode rejects instead of returning a fake code',
    await rejects(() => svc.generateSyncChainCode({}))
  );
  check(
    'joinSyncChain rejects instead of pretending to pair',
    await rejects(() => svc.joinSyncChain('nova-xxxx-xxxx-xxxx'))
  );
  check(
    'the rejection names the working alternative',
    /Nova Cloud account/i.test(await svc.joinSyncChain('x').catch((e: any) => e.message))
  );
  console.log(`\n${passed} sync-pairing-UI checks passed\n`);
})();

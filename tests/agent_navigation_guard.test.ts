/**
 * Agent navigation connect-time guard.
 *
 * `isSafeAgentNavigationUrl` in the renderer refuses IP literals in every
 * non-public range, but it cannot resolve a DNS name. This is the second layer
 * that closes the gap, and it is the piece an attacker actually reaches with a
 * domain they control, so the policy is tested against the real `isPrivateIP`
 * rather than a re-implementation.
 *
 * The resolver is injected, so these cases are deterministic and no test depends
 * on live DNS.
 */

import {
  isAgentNavigationHostPublic,
  classifyResolvedAddresses,
  normaliseLookupHost,
  type LookupFn
} from '../electron/main/agentNavigationGuard';

console.log('--- Agent Navigation Guard (DNS pinning) ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [AgentNav-Guard] ${name}`); }
  else { console.log(`[FAIL] [AgentNav-Guard] ${name} ${extra}`); process.exitCode = 1; }
}

const resolvingTo = (...addresses: string[]): LookupFn => async () =>
  addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));

(async () => {
  // --- the attack this layer exists for -------------------------------
  check(
    'public name resolving to 127.0.0.1 is refused',
    !(await isAgentNavigationHostPublic('https://evil.example/', resolvingTo('127.0.0.1'))).allowed
  );
  check(
    'public name resolving to the cloud metadata address is refused',
    !(await isAgentNavigationHostPublic('https://evil.example/', resolvingTo('169.254.169.254'))).allowed
  );
  check(
    'public name resolving to RFC1918 is refused',
    !(await isAgentNavigationHostPublic('https://evil.example/', resolvingTo('10.0.0.5'))).allowed
  );
  check(
    'public name resolving to ::1 is refused',
    !(await isAgentNavigationHostPublic('https://evil.example/', resolvingTo('::1'))).allowed
  );
  check(
    'public name resolving to a 6to4-wrapped private address is refused',
    !(await isAgentNavigationHostPublic('https://evil.example/', resolvingTo('2002:7f00:0001::1'))).allowed
  );

  // --- one public answer does not launder a private one ---------------
  check(
    'a public + private mix is refused (Chromium picks, we do not)',
    !(await isAgentNavigationHostPublic('https://mixed.example/', resolvingTo('93.184.216.34', '127.0.0.1'))).allowed
  );
  check(
    'a private + public mix is refused too',
    !(await isAgentNavigationHostPublic('https://mixed.example/', resolvingTo('127.0.0.1', '93.184.216.34'))).allowed
  );

  // --- the ordinary case still works ---------------------------------
  const good = await isAgentNavigationHostPublic('https://example.com/', resolvingTo('93.184.216.34'));
  check('a genuinely public name is allowed', good.allowed === true, good.reason);
  const v6 = await isAgentNavigationHostPublic('https://example.com/', resolvingTo('2606:2800:220:1::1'));
  check('a public IPv6 answer is allowed', v6.allowed === true, v6.reason);

  // --- fail closed ---------------------------------------------------
  const empty = await isAgentNavigationHostPublic('https://nowhere.example/', async () => []);
  check('an empty answer is refused', empty.allowed === false, empty.reason);
  const boom = await isAgentNavigationHostPublic('https://dead.example/', async () => { throw new Error('SERVFAIL'); });
  check('a resolver error is refused', boom.allowed === false, boom.reason);
  check('the resolver error is surfaced', /SERVFAIL/.test(boom.reason), boom.reason);
  const timeout = await isAgentNavigationHostPublic('https://slow.example/', () => new Promise(() => {}));
  check('a hung resolver times out into a refusal', timeout.allowed === false, timeout.reason);
  check('the timeout path is a refusal, not a hang', /timeout/i.test(timeout.reason), timeout.reason);

  // --- literals do not need a round trip -----------------------------
  const literal = async () => { throw new Error('lookup must not be called for a literal'); };
  check('a private literal is refused without resolving', !(await isAgentNavigationHostPublic('http://127.0.0.1:8080/', literal)).allowed);
  check('a public literal is allowed without resolving', (await isAgentNavigationHostPublic('https://93.184.216.34/', literal)).allowed);

  // --- malformed input ----------------------------------------------
  check('a non-URL is refused', !(await isAgentNavigationHostPublic('not a url', literal)).allowed);
  for (const scheme of ['file:', 'javascript:', 'data:', 'chrome:']) {
    check(`the ${scheme} scheme is refused`, !(await isAgentNavigationHostPublic(`${scheme}//x/`, literal)).allowed);
  }
  check('an empty url is refused', !(await isAgentNavigationHostPublic('', literal)).allowed);

  // --- the classifier on its own -------------------------------------
  check('classify: no answers refused', classifyResolvedAddresses([]).allowed === false);
  check('classify: a non-array is refused', classifyResolvedAddresses(null as any).allowed === false);
  check('classify: an addressless entry is refused', classifyResolvedAddresses([{} as any]).allowed === false);
  check('classify: an empty address is refused', classifyResolvedAddresses([{ address: '' }]).allowed === false);
  check('classify: plain strings are accepted as well as objects', classifyResolvedAddresses(['93.184.216.34']).allowed === true);
  check('classify: an unparseable address fails closed', classifyResolvedAddresses([{ address: 'not-an-ip' }]).allowed === false);
  check('classify: CGNAT 100.64.0.0/10 is non-public', classifyResolvedAddresses([{ address: '100.64.1.1' }]).allowed === false);
  check('classify: TEST-NET-1 is non-public', classifyResolvedAddresses([{ address: '192.0.2.1' }]).allowed === false);
  check('classify: multicast is non-public', classifyResolvedAddresses([{ address: '224.0.0.1' }]).allowed === false);

  // --- host normalisation -------------------------------------------
  check('normalise strips IPv6 brackets', normaliseLookupHost('[::1]') === '::1');
  check('normalise strips the IPv6 zone id', normaliseLookupHost('fe80::1%eth0') === 'fe80::1');
  check('normalise strips the root dot', normaliseLookupHost('example.com.') === 'example.com');
  check('normalise lowercases', normaliseLookupHost('EXAMPLE.COM') === 'example.com');
  check('normalise rejects an empty host', normaliseLookupHost('   ') === null);
  check('normalise rejects a lone root dot', normaliseLookupHost('.') === null);

  // The cases above all inject a resolver, which means they can never catch a
  // broken DEFAULT resolver. That is not hypothetical: an early version called
  // the callback-style dns.lookup without a callback, so every hostname - real
  // public sites included - came back "DNS resolution failed" and the guard
  // blocked all agent navigation. These two cases run the real one.
  {
    const real = await isAgentNavigationHostPublic('https://example.com/');
    check(
      'the REAL default resolver returns a verdict (not an internal resolver error)',
      !/DNS resolution failed/.test(real.reason),
      real.reason
    );
    check('a real public site is allowed through the real resolver', real.allowed === true, real.reason);

    const loopback = await isAgentNavigationHostPublic('http://localhost:3000/');
    check(
      'a real name that resolves to loopback is refused by the real resolver',
      loopback.allowed === false,
      loopback.reason
    );
  }

  console.log(`\n${passed} agent-navigation-guard checks passed\n`);
})();

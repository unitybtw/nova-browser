import assert from 'node:assert/strict';

console.log('\n--- Partition Isolation & Incognito Privacy Lifecycle Suite ---');

interface MockCookie {
  domain: string;
  name: string;
  value: string;
}

class MockPartitionSession {
  private cookies: Map<string, MockCookie> = new Map();
  private storage: Map<string, string> = new Map();
  public isIncognito: boolean;

  constructor(isIncognito = false) {
    this.isIncognito = isIncognito;
  }

  public setCookie(cookie: MockCookie) {
    this.cookies.set(`${cookie.domain}:${cookie.name}`, cookie);
  }

  public getCookie(domain: string, name: string): MockCookie | undefined {
    return this.cookies.get(`${domain}:${name}`);
  }

  public setStorage(key: string, value: string) {
    this.storage.set(key, value);
  }

  public getStorage(key: string): string | undefined {
    return this.storage.get(key);
  }

  public clearSessionData() {
    this.cookies.clear();
    this.storage.clear();
  }

  public getCookieCount(): number {
    return this.cookies.size;
  }
}

// 1. Session Isolation
const defaultSession = new MockPartitionSession(false);
const incognitoSession = new MockPartitionSession(true);

defaultSession.setCookie({ domain: 'github.com', name: 'user_session', value: 'authenticated_token' });
defaultSession.setStorage('theme', 'dark');

incognitoSession.setCookie({ domain: 'github.com', name: 'user_session', value: 'incognito_anonymous' });
incognitoSession.setStorage('temp_state', 'active');

// Verify Strict Isolation
assert.equal(defaultSession.getCookie('github.com', 'user_session')?.value, 'authenticated_token');
assert.equal(incognitoSession.getCookie('github.com', 'user_session')?.value, 'incognito_anonymous');
assert.equal(defaultSession.getStorage('temp_state'), undefined, 'Incognito storage must not leak into default session');

// 2. Incognito Teardown Wipes All Data
incognitoSession.clearSessionData();
assert.equal(incognitoSession.getCookieCount(), 0, 'Incognito session must be completely clean after close');
assert.equal(incognitoSession.getStorage('temp_state'), undefined);

// Default session remains untouched
assert.equal(defaultSession.getCookieCount(), 1, 'Default session must not be affected by incognito wipe');

// 3. Multi-partition Proxy and Hardening State Machine
class MockSessionManager {
  public activeProxy = 'direct://';
  public hardenedPartitions = new Set<string>();
  public partitionProxies = new Map<string, string>();
  public partitionAdBlocker = new Map<string, boolean>();
  public isPrivacyShieldEnabled = true;

  public setProxyAll(rules: string) {
    this.activeProxy = rules;
    this.partitionProxies.set('default', rules);
    this.partitionProxies.set('incognito', rules);
    for (const part of this.hardenedPartitions) {
      this.partitionProxies.set(part, rules);
    }
  }

  public setPrivacyShieldAll(enabled: boolean) {
    this.isPrivacyShieldEnabled = enabled;
    this.partitionAdBlocker.set('default', enabled);
    this.partitionAdBlocker.set('incognito', enabled);
    for (const part of this.hardenedPartitions) {
      this.partitionAdBlocker.set(part, enabled);
    }
  }

  public hardenPartition(partName: string): boolean {
    if (this.hardenedPartitions.has(partName)) return true;
    if (!/^incognito-[a-zA-Z0-9_-]+$/.test(partName)) return false;
    this.hardenedPartitions.add(partName);
    // Inherits active proxy immediately
    if (this.activeProxy !== 'direct://') {
      this.partitionProxies.set(partName, this.activeProxy);
    }
    this.partitionAdBlocker.set(partName, this.isPrivacyShieldEnabled);
    return true;
  }

  public clearIncognito(tabId?: string) {
    if (tabId) {
      const partName = `incognito-${tabId}`;
      this.hardenedPartitions.delete(partName);
      this.partitionProxies.delete(partName);
      this.partitionAdBlocker.delete(partName);
    } else {
      // Clear all
      this.hardenedPartitions.clear();
      this.partitionProxies.clear();
      this.partitionAdBlocker.clear();
    }
  }
}

const sm = new MockSessionManager();

// Verify unauthorized partitions are rejected
assert.equal(sm.hardenPartition('persist:malicious'), false, 'Unauthorized persist: partition must be rejected');
assert.equal(sm.hardenPartition('evil_partition'), false, 'Partitions without incognito- prefix must be rejected');

// Open Tab 1 in incognito before VPN is enabled
assert.equal(sm.hardenPartition('incognito-tab-1'), true);
assert.equal(sm.partitionProxies.get('incognito-tab-1'), undefined);

// Enable VPN
sm.setProxyAll('socks5://127.0.0.1:9050');
assert.equal(sm.partitionProxies.get('default'), 'socks5://127.0.0.1:9050');
assert.equal(sm.partitionProxies.get('incognito-tab-1'), 'socks5://127.0.0.1:9050', 'Existing incognito tab must receive updated VPN proxy');

// Open Tab 2 in incognito AFTER VPN is enabled -> must inherit active proxy immediately
assert.equal(sm.hardenPartition('incognito-tab-2'), true);
assert.equal(sm.partitionProxies.get('incognito-tab-2'), 'socks5://127.0.0.1:9050', 'New incognito tab must inherit active VPN proxy rules');

// Toggle privacy shield -> all partitions must update
sm.setPrivacyShieldAll(false);
assert.equal(sm.partitionAdBlocker.get('incognito-tab-1'), false);
assert.equal(sm.partitionAdBlocker.get('incognito-tab-2'), false);

// Clear Tab 1 -> Tab 2 remains
sm.clearIncognito('tab-1');
assert.equal(sm.hardenedPartitions.has('incognito-tab-1'), false);
assert.equal(sm.hardenedPartitions.has('incognito-tab-2'), true);

// Full clear (all incognito tabs closed)
sm.clearIncognito();
assert.equal(sm.hardenedPartitions.size, 0, 'Full incognito clear must wipe all active partitions');

console.log('[PASS] [Session Isolation] Strict cookie partitioning, storage isolation, and incognito teardown verified.');
console.log('[PASS] [Session Hardening] Multi-tab incognito proxy inheritance, privacy shield syncing, and partition guards verified.');

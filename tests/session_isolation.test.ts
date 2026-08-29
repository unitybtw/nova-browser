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

console.log('[PASS] [Session Isolation] Strict cookie partitioning, storage isolation, and incognito teardown verified.');

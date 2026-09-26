import assert from 'node:assert/strict';
import type { PermissionRequest } from '../src/types/browser';

console.log('\n--- Permission Prompts Lifecycle & Flood Protection Test Suite ---');

// 1. Permission Queueing with Flood Protection (Max 5 concurrent prompts)
function queuePermissionRequest(
  currentQueue: PermissionRequest[],
  incoming: PermissionRequest,
  onAutoReject?: (requestId: string) => void
): PermissionRequest[] {
  const filtered = currentQueue.filter(r => r.requestId !== incoming.requestId);
  if (filtered.length >= 5) {
    onAutoReject?.(incoming.requestId);
    return filtered;
  }
  return [...filtered, incoming];
}

const mockRequest = (id: string, origin: string, permission: PermissionRequest['permission']): PermissionRequest => ({
  requestId: id,
  origin,
  permission
});

let queue: PermissionRequest[] = [];
const autoRejected: string[] = [];

// Add 5 legitimate permission requests
for (let i = 1; i <= 5; i++) {
  queue = queuePermissionRequest(queue, mockRequest(`req-${i}`, `https://site${i}.com`, 'notifications'));
}
assert.strictEqual(queue.length, 5, 'Queue should hold 5 requests');

// Attempt to add 6th, 7th, 8th request (flood attack simulation)
for (let i = 6; i <= 8; i++) {
  queue = queuePermissionRequest(
    queue,
    mockRequest(`req-${i}`, `https://malicious-flooder.com`, 'geolocation'),
    (reqId) => autoRejected.push(reqId)
  );
}

assert.strictEqual(queue.length, 5, 'Queue must cap at 5 requests to prevent UI flood Denial-of-Service');
assert.deepStrictEqual(autoRejected, ['req-6', 'req-7', 'req-8'], 'Excess requests must be auto-rejected immediately');

console.log('[PASS] [Permission Prompts] Queueing caps at 5 concurrent requests and auto-rejects flood attacks');

// 2. Deduplication of Identical Request IDs
const deduplicated = queuePermissionRequest(
  queue,
  mockRequest('req-1', 'https://site1.com', 'camera')
);
assert.strictEqual(deduplicated.length, 5, 'Same requestId must replace existing and not increase queue length');
assert.strictEqual(deduplicated.find(r => r.requestId === 'req-1')?.permission, 'camera');

console.log('[PASS] [Permission Prompts] Duplicate request IDs cleanly updated in-place');

// 3. Dismissal and Response Handlers
function dismissPermission(queue: PermissionRequest[], requestId: string): PermissionRequest[] {
  return queue.filter(r => r.requestId !== requestId);
}

const afterDismiss = dismissPermission(queue, 'req-2');
assert.strictEqual(afterDismiss.length, 4);
assert.strictEqual(afterDismiss.some(r => r.requestId === 'req-2'), false);

console.log('[PASS] [Permission Prompts] Dismiss and response cleanly evicts request from active queue');

// 4. Cross-Platform Internal App Microphone Permission & Settings Resolution (Fail-Closed)
function evaluateInternalAppPermission(
  permission: string,
  mediaTypes: string[] | undefined,
  platform: 'darwin' | 'win32' | 'linux',
  mockMacStatus: 'granted' | 'denied' | 'not-determined' = 'granted',
  isRemembered: boolean = false
): boolean {
  if (permission === 'media') {
    const requestsVideo = mediaTypes?.includes('video');
    const requestsAudio = !mediaTypes || mediaTypes.includes('audio');
    if (requestsAudio && !requestsVideo) {
      if (platform === 'darwin') {
        if (mockMacStatus !== 'granted') return false; // Fail closed on macOS
      }
      return isRemembered; // Fail closed: requires explicit user permission / remember
    }
  }
  return false; // Camera, location, and other permissions remain strictly blocked for internal pages
}

function resolveSystemSettingsUri(pane: string | undefined, platform: 'darwin' | 'win32' | 'linux'): string {
  if (platform === 'darwin') {
    return pane === 'microphone'
      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
      : 'x-apple.systempreferences:';
  }
  if (platform === 'win32') {
    return pane === 'microphone'
      ? 'ms-settings:privacy-microphone'
      : 'ms-settings:';
  }
  return 'pavucontrol';
}

// Fail-closed when not yet remembered/granted: prompts user
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'win32', 'granted', false), false);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'linux', 'granted', false), false);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'darwin', 'granted', false), false);

// Allowed when explicitly granted and remembered
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'win32', 'granted', true), true);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'linux', 'granted', true), true);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'darwin', 'granted', true), true);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio'], 'darwin', 'denied', true), false);

// Camera or video is strictly blocked across all platforms for app internal pages even if remembered
assert.strictEqual(evaluateInternalAppPermission('media', ['video'], 'win32', 'granted', true), false);
assert.strictEqual(evaluateInternalAppPermission('media', ['video'], 'linux', 'granted', true), false);
assert.strictEqual(evaluateInternalAppPermission('media', ['video'], 'darwin', 'granted', true), false);
assert.strictEqual(evaluateInternalAppPermission('media', ['audio', 'video'], 'win32', 'granted', true), false);
assert.strictEqual(evaluateInternalAppPermission('geolocation', undefined, 'win32', 'granted', true), false);

// System Settings URIs per OS
assert.strictEqual(resolveSystemSettingsUri('microphone', 'darwin'), 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
assert.strictEqual(resolveSystemSettingsUri('microphone', 'win32'), 'ms-settings:privacy-microphone');
assert.strictEqual(resolveSystemSettingsUri('microphone', 'linux'), 'pavucontrol');

console.log('[PASS] [Permission Prompts] Fail-closed cross-platform microphone permissions and system settings resolution verified.');

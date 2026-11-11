import assert from 'node:assert/strict';

// Test harness simulating set-window-material handler logic
function createMaterialHandler() {
  let currentWindowMaterial: 'opaque' | 'glass-vibrancy' = 'opaque';
  const calls: {
    backgroundColor?: string;
    vibrancy?: string | null;
    backgroundMaterial?: string;
  } = {};

  let isDestroyed = false;
  let throwOnCall = false;

  const mockWindow = {
    isDestroyed: () => isDestroyed,
    setBackgroundColor: (color: string) => {
      if (throwOnCall) throw new Error('OS Compositor Failure');
      calls.backgroundColor = color;
    },
    setVibrancy: (vib: string | null) => {
      if (throwOnCall) throw new Error('OS Compositor Failure');
      calls.vibrancy = vib;
    },
    setBackgroundMaterial: (mat: string) => {
      if (throwOnCall) throw new Error('OS Compositor Failure');
      calls.backgroundMaterial = mat;
    },
  };

  const handler = (
    event: { isTrusted: boolean },
    material: any,
    platform: string,
    darkMode: boolean,
    windowInstance: any = mockWindow
  ) => {
    if (!event.isTrusted) return false;
    if (material !== 'opaque' && material !== 'glass-vibrancy') return false;
    currentWindowMaterial = material;
    if (!windowInstance || windowInstance.isDestroyed()) return false;
    try {
      if (platform === 'darwin') {
        if (material === 'glass-vibrancy') {
          windowInstance.setBackgroundColor('#00000000');
          windowInstance.setVibrancy('under-window');
        } else {
          windowInstance.setVibrancy(null);
          windowInstance.setBackgroundColor(darkMode ? '#0f172a' : '#f8fafc');
        }
      } else if (platform === 'win32' && typeof windowInstance.setBackgroundMaterial === 'function') {
        windowInstance.setBackgroundMaterial(material === 'glass-vibrancy' ? 'acrylic' : 'none');
      }
      return true;
    } catch {
      return false;
    }
  };

  return {
    handler,
    calls,
    setDestroyed: (d: boolean) => { isDestroyed = d; },
    setThrow: (t: boolean) => { throwOnCall = t; },
    getCurrentMaterial: () => currentWindowMaterial,
  };
}

console.log('--- Testing Window Material IPC Logic ---');

// 1. Untrusted sender rejected
{
  const { handler, calls } = createMaterialHandler();
  const res = handler({ isTrusted: false }, 'glass-vibrancy', 'darwin', true);
  assert.equal(res, false, 'Untrusted sender must be rejected');
  assert.equal(calls.backgroundColor, undefined);
  assert.equal(calls.vibrancy, undefined);
}

// 2. Invalid material values rejected
{
  const { handler, calls } = createMaterialHandler();
  const res1 = handler({ isTrusted: true }, 'invalid-material', 'darwin', true);
  assert.equal(res1, false, 'Invalid material rejected');
  const res2 = handler({ isTrusted: true }, null, 'darwin', true);
  assert.equal(res2, false, 'Null material rejected');
  const res3 = handler({ isTrusted: true }, 123, 'darwin', true);
  assert.equal(res3, false, 'Numeric material rejected');
  assert.equal(calls.backgroundColor, undefined);
}

// 3. Destroyed or null window safely handled
{
  const { handler, setDestroyed, calls } = createMaterialHandler();
  setDestroyed(true);
  const res = handler({ isTrusted: true }, 'glass-vibrancy', 'darwin', true);
  assert.equal(res, false, 'Destroyed window returns false cleanly');
  assert.equal(calls.backgroundColor, undefined);

  const resNull = handler({ isTrusted: true }, 'glass-vibrancy', 'darwin', true, null);
  assert.equal(resNull, false, 'Null window returns false cleanly');
}

// 4. macOS glass-vibrancy sets transparent background and under-window vibrancy
{
  const { handler, calls, getCurrentMaterial } = createMaterialHandler();
  const res = handler({ isTrusted: true }, 'glass-vibrancy', 'darwin', true);
  assert.equal(res, true);
  assert.equal(calls.backgroundColor, '#00000000');
  assert.equal(calls.vibrancy, 'under-window');
  assert.equal(getCurrentMaterial(), 'glass-vibrancy');
}

// 5. macOS opaque sets vibrancy null and dark mode background (#0f172a)
{
  const { handler, calls, getCurrentMaterial } = createMaterialHandler();
  const res = handler({ isTrusted: true }, 'opaque', 'darwin', true);
  assert.equal(res, true);
  assert.equal(calls.backgroundColor, '#0f172a');
  assert.equal(calls.vibrancy, null);
  assert.equal(getCurrentMaterial(), 'opaque');
}

// 6. macOS opaque sets vibrancy null and light mode background (#f8fafc)
{
  const { handler, calls, getCurrentMaterial } = createMaterialHandler();
  const res = handler({ isTrusted: true }, 'opaque', 'darwin', false);
  assert.equal(res, true);
  assert.equal(calls.backgroundColor, '#f8fafc');
  assert.equal(calls.vibrancy, null);
  assert.equal(getCurrentMaterial(), 'opaque');
}

// 7. Windows glass-vibrancy sets acrylic background material
{
  const { handler, calls } = createMaterialHandler();
  const res = handler({ isTrusted: true }, 'glass-vibrancy', 'win32', true);
  assert.equal(res, true);
  assert.equal(calls.backgroundMaterial, 'acrylic');
}

// 8. Windows opaque sets none background material
{
  const { handler, calls } = createMaterialHandler();
  const res = handler({ isTrusted: true }, 'opaque', 'win32', true);
  assert.equal(res, true);
  assert.equal(calls.backgroundMaterial, 'none');
}

// 9. OS Compositor exception caught cleanly without crashing
{
  const { handler, setThrow } = createMaterialHandler();
  setThrow(true);
  const res = handler({ isTrusted: true }, 'glass-vibrancy', 'darwin', true);
  assert.equal(res, false, 'Compositor exception caught safely');
}

console.log('[PASS] All window material IPC logic tests passed cleanly.');

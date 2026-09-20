import assert from 'node:assert/strict';
import { ZOOM_FACTORS } from '../src/hooks/useZoom';

console.log('\n--- Zoom Factors & Boundary Clamping Test Suite ---');

// 1. Array invariants
assert.strictEqual(ZOOM_FACTORS[0], 0.25, 'Minimum zoom factor must be 0.25 (25%)');
assert.strictEqual(ZOOM_FACTORS[ZOOM_FACTORS.length - 1], 5.0, 'Maximum zoom factor must be 5.0 (500%)');
assert.strictEqual(ZOOM_FACTORS.includes(1.0), true, 'Default 1.0 (100%) zoom factor must be present');

// 2. Monotonicity
for (let i = 0; i < ZOOM_FACTORS.length - 1; i++) {
  assert(
    ZOOM_FACTORS[i] < ZOOM_FACTORS[i + 1],
    `ZOOM_FACTORS must be strictly increasing: ${ZOOM_FACTORS[i]} < ${ZOOM_FACTORS[i + 1]}`
  );
}

console.log('[PASS] [Zoom Factors] Array monotonicity and boundary constraints verified');

// 3. Step Up algorithm
function getNextZoomFactor(currentFactor: number): number {
  return ZOOM_FACTORS.find(f => f > currentFactor + 0.01) || ZOOM_FACTORS[ZOOM_FACTORS.length - 1];
}

assert.strictEqual(getNextZoomFactor(1.0), 1.1, 'Zoom in from 1.0 must produce 1.1');
assert.strictEqual(getNextZoomFactor(1.1), 1.25, 'Zoom in from 1.1 must produce 1.25');
assert.strictEqual(getNextZoomFactor(0.25), 0.33, 'Zoom in from 0.25 must produce 0.33');
assert.strictEqual(getNextZoomFactor(4.0), 5.0, 'Zoom in from 4.0 must produce 5.0');
assert.strictEqual(getNextZoomFactor(5.0), 5.0, 'Zoom in from 5.0 must clamp at 5.0');
assert.strictEqual(getNextZoomFactor(6.5), 5.0, 'Zoom in from >5.0 must clamp at 5.0');

// Float inaccuracy tolerance (e.g. 1.00000001 or 0.999999)
assert.strictEqual(getNextZoomFactor(1.0000001), 1.1, 'Zoom in with minor float jitter must advance to 1.1');

console.log('[PASS] [Zoom Factors] Step-up ladder and upper bound clamping verified');

// 4. Step Down algorithm
function getPrevZoomFactor(currentFactor: number): number {
  return [...ZOOM_FACTORS].reverse().find(f => f < currentFactor - 0.01) || ZOOM_FACTORS[0];
}

assert.strictEqual(getPrevZoomFactor(1.0), 0.9, 'Zoom out from 1.0 must produce 0.9');
assert.strictEqual(getPrevZoomFactor(0.9), 0.8, 'Zoom out from 0.9 must produce 0.8');
assert.strictEqual(getPrevZoomFactor(5.0), 4.0, 'Zoom out from 5.0 must produce 4.0');
assert.strictEqual(getPrevZoomFactor(0.33), 0.25, 'Zoom out from 0.33 must produce 0.25');
assert.strictEqual(getPrevZoomFactor(0.25), 0.25, 'Zoom out from 0.25 must clamp at 0.25');
assert.strictEqual(getPrevZoomFactor(0.1), 0.25, 'Zoom out from <0.25 must clamp at 0.25');

// Float inaccuracy tolerance
assert.strictEqual(getPrevZoomFactor(1.0000001), 0.9, 'Zoom out with minor float jitter must step down to 0.9');

console.log('[PASS] [Zoom Factors] Step-down ladder and lower bound clamping verified');

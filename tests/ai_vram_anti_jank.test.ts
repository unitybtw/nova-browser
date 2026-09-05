import assert from 'assert';
import { aiAgent } from '../src/services/aiAgent';

console.log('\n--- AI GPU VRAM & Anti-Jank Compositor Yielding Suite ---');

// Test 1: Initial state before model is loaded
assert.strictEqual(aiAgent.isEngineLoaded(), false, 'Engine should not be loaded on initial import');
assert.strictEqual(aiAgent.getVramEstimate(), 0, 'VRAM estimate should be 0 MB when engine is not loaded');

// Test 2: Auto-park timeout settings
assert.strictEqual(aiAgent.getAutoParkTimeoutMinutes(), 3, 'Default auto-park timeout should be 3 minutes');
aiAgent.setAutoParkTimeoutMinutes(5);
assert.strictEqual(aiAgent.getAutoParkTimeoutMinutes(), 5, 'Auto-park timeout should update to 5 minutes');
aiAgent.setAutoParkTimeoutMinutes(3); // Reset to default
assert.strictEqual(aiAgent.getAutoParkTimeoutMinutes(), 3, 'Auto-park timeout reset to 3 minutes');

// Test 3: Park model on uninitialized agent is a safe no-op
aiAgent.parkModel().then(() => {
  assert.strictEqual(aiAgent.isEngineLoaded(), false, 'Engine should remain unloaded after parkModel');
  assert.strictEqual(aiAgent.getVramEstimate(), 0, 'VRAM estimate remains 0');
  
  // Test 4: yieldToCompositor resolves cleanly
  return aiAgent.yieldToCompositor();
}).then(() => {
  console.log('[PASS] [AI-VRAM-1] Initial VRAM footprint verified at 0 MB.');
  console.log('[PASS] [AI-VRAM-2] Inactivity auto-park timeout persistence verified.');
  console.log('[PASS] [AI-VRAM-3] Safe model parking without active engine verified.');
  console.log('[PASS] [AI-VRAM-4] Cooperative compositor micro-yielding verified.');
}).catch((err) => {
  console.error('AI VRAM test failure:', err);
  process.exit(1);
});

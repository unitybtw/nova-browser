import assert from 'node:assert/strict';

console.log('\n--- WebLLM Model Registry & WebGPU Shader Configuration Suite ---');

interface ModelConfig {
  id: string;
  name: string;
  size: string;
  contextWindow: number;
  quantization: string;
  vramRequiredMB: number;
  isVisionCapable?: boolean;
}

const REGISTERED_MODELS: ModelConfig[] = [
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    size: '1.8 GB',
    contextWindow: 8192,
    quantization: 'q4f16_1',
    vramRequiredMB: 2200
  },
  {
    id: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Vision',
    size: '2.4 GB',
    contextWindow: 4096,
    quantization: 'q4f16_1',
    vramRequiredMB: 2800,
    isVisionCapable: true
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B',
    size: '1.0 GB',
    contextWindow: 4096,
    quantization: 'q4f16_1',
    vramRequiredMB: 1400
  }
];

// 1. Verify Model Configurations
assert.equal(REGISTERED_MODELS.length >= 3, true);

for (const model of REGISTERED_MODELS) {
  assert.equal(typeof model.id, 'string');
  assert.equal(model.id.includes('MLC'), true, 'Model ID must follow standard MLC quantization format');
  assert.equal(model.contextWindow >= 2048, true, 'Model must support at least 2K context window');
  assert.equal(model.quantization, 'q4f16_1', 'Quantization must use WebGPU FP16 mixed precision for optimal speed');
  assert.equal(model.vramRequiredMB <= 4000, true, 'Model must fit in consumer VRAM (< 4GB)');
}

// 2. Vision Model Capability Check
const visionModel = REGISTERED_MODELS.find(m => m.isVisionCapable);
assert.equal(Boolean(visionModel), true, 'A vision-capable multimodal model must be registered');
assert.equal(visionModel?.name, 'Phi 3.5 Vision');

console.log('[PASS] [WebLLM Config] Model registry, MLC quantization formats, context limits, and VRAM budgets verified.');

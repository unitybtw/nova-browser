import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('CHALLENGER M4: EMPIRICAL BUNDLE SIZE & ASSET VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}${details ? ` -> ${details}` : ''}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

console.log('--- 1. Testing Production Dist Output & Chunk Size Limits ---');

assert(fs.existsSync(DIST_DIR), '[Build Exists] dist directory exists');
assert(fs.existsSync(ASSETS_DIR), '[Assets Exists] dist/assets directory exists');

const assetFiles = fs.readdirSync(ASSETS_DIR);

// 1.1 Check index chunk size
const indexChunk = assetFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
assert(Boolean(indexChunk), '[Index Chunk] Initial startup entry index-*.js found', indexChunk);

if (indexChunk) {
  const stat = fs.statSync(path.join(ASSETS_DIR, indexChunk));
  const sizeKB = stat.size / 1024;
  assert(sizeKB < 1000, '[Index Chunk Size < 1000KB]', `Actual size: ${sizeKB.toFixed(2)} KB (must be < 1000 KB)`);
  assert(sizeKB < 500, '[Index Chunk Size < 500KB]', `Actual size: ${sizeKB.toFixed(2)} KB (must be < 500 KB)`);
}

// 1.2 Check vendor-react chunk size
const reactChunk = assetFiles.find(f => f.startsWith('vendor-react-') && f.endsWith('.js'));
assert(Boolean(reactChunk), '[Vendor React Chunk] vendor-react-*.js found', reactChunk);
if (reactChunk) {
  const stat = fs.statSync(path.join(ASSETS_DIR, reactChunk));
  const sizeKB = stat.size / 1024;
  assert(sizeKB < 300, '[Vendor React Chunk Size < 300KB]', `Actual size: ${sizeKB.toFixed(2)} KB`);
}

// 1.3 Check vendor-ui chunk size
const uiChunk = assetFiles.find(f => f.startsWith('vendor-ui-') && f.endsWith('.js'));
assert(Boolean(uiChunk), '[Vendor UI Chunk] vendor-ui-*.js found', uiChunk);
if (uiChunk) {
  const stat = fs.statSync(path.join(ASSETS_DIR, uiChunk));
  const sizeKB = stat.size / 1024;
  assert(sizeKB < 300, '[Vendor UI Chunk Size < 300KB]', `Actual size: ${sizeKB.toFixed(2)} KB`);
}

console.log('\n--- 2. Testing WebLLM Separation & Lazy Loading ---');

// 2.1 Check web-llm chunk exists and is split out
const webLlmChunk = assetFiles.find(f => f.startsWith('web-llm-') && f.endsWith('.js'));
assert(Boolean(webLlmChunk), '[WebLLM Chunk] Separate web-llm-*.js chunk generated', webLlmChunk);

if (webLlmChunk) {
  const webLlmContent = fs.readFileSync(path.join(ASSETS_DIR, webLlmChunk), 'utf8');
  assert(webLlmContent.length > 5 * 1024 * 1024, '[WebLLM Chunk Size > 5MB]', `Actual size: ${(webLlmContent.length / 1024 / 1024).toFixed(2)} MB`);
  assert(webLlmContent.includes('TVM') || webLlmContent.includes('tvm'), '[WebLLM Chunk Content] Contains TVM runtime engine');
}

// 2.2 Verify index.html does NOT preload or script-include web-llm or aiWorker
const indexHtmlPath = path.join(DIST_DIR, 'index.html');
assert(fs.existsSync(indexHtmlPath), '[index.html] Exists');
if (fs.existsSync(indexHtmlPath)) {
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  assert(!htmlContent.includes('web-llm'), '[index.html Isolation] index.html does NOT load or preload web-llm');
  assert(!htmlContent.includes('aiWorker'), '[index.html Isolation] index.html does NOT load or preload aiWorker');
  assert(htmlContent.includes(indexChunk || 'index-'), '[index.html Entry] index.html correctly references entry chunk');
}

// 2.3 Verify index-*.js does NOT contain heavy TVM/WebLLM runtime and delegates via dynamic import
if (indexChunk && webLlmChunk) {
  const indexContent = fs.readFileSync(path.join(ASSETS_DIR, indexChunk), 'utf8');
  assert(!indexContent.includes('TVMRuntime') && !indexContent.includes('tvmjs'), '[Index Entry Isolation] index-*.js does not contain TVM runtime');
  assert(indexContent.includes(webLlmChunk), '[Dynamic Import Linkage] index-*.js links to web-llm chunk via dynamic import()', webLlmChunk);
}

// 2.4 Verify src/services/aiAgent.ts uses type-only import
const aiAgentPath = path.join(ROOT_DIR, 'src', 'services', 'aiAgent.ts');
assert(fs.existsSync(aiAgentPath), '[aiAgent.ts] Exists');
if (fs.existsSync(aiAgentPath)) {
  const aiAgentContent = fs.readFileSync(aiAgentPath, 'utf8');
  const hasTypeOnlyImport = /^import\s+type\s+\{.*\}\s+from\s+["']@mlc-ai\/web-llm["'];/m.test(aiAgentContent);
  assert(hasTypeOnlyImport, '[aiAgent.ts Import] Uses `import type { ... } from "@mlc-ai/web-llm"` for type elision');

  const hasDynamicImport = /import\(["']@mlc-ai\/web-llm["']\)/.test(aiAgentContent);
  assert(hasDynamicImport, '[aiAgent.ts Dynamic Import] Dynamically imports `@mlc-ai/web-llm` on demand');
}

console.log('\n--- 3. Testing Dead Code Elimination (src/services/aiWorker.ts) ---');

// 3.1 Verify src/services/aiWorker.ts is deleted
const deadWorkerPath = path.join(ROOT_DIR, 'src', 'services', 'aiWorker.ts');
assert(!fs.existsSync(deadWorkerPath), '[Dead Code Deleted] src/services/aiWorker.ts is completely removed from filesystem');

// 3.2 Verify active worker exists in src/workers/aiWorker.ts
const activeWorkerPath = path.join(ROOT_DIR, 'src', 'workers', 'aiWorker.ts');
assert(fs.existsSync(activeWorkerPath), '[Active Worker Exists] Canonical worker exists in src/workers/aiWorker.ts');

// 3.3 Verify no file in src/ imports services/aiWorker
const srcDir = path.join(ROOT_DIR, 'src');
function checkImportsRecursively(dir: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!checkImportsRecursively(fullPath)) return false;
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('services/aiWorker') || content.includes('./aiWorker')) {
        return false;
      }
    }
  }
  return true;
}
assert(checkImportsRecursively(srcDir), '[No Dangling Imports] No source files import from dead services/aiWorker');

console.log('\n--- 4. Testing Vite Configuration Verification ---');

const viteConfigPath = path.join(ROOT_DIR, 'vite.config.ts');
assert(fs.existsSync(viteConfigPath), '[vite.config.ts] Exists');
if (fs.existsSync(viteConfigPath)) {
  const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
  assert(/chunkSizeWarningLimit:\s*1000/.test(viteContent), '[vite.config.ts] chunkSizeWarningLimit is set to 1000');
  assert(/manualChunks:\s*\{[\s\S]*'web-llm':\s*\[\s*['"]@mlc-ai\/web-llm['"]\s*\]/.test(viteContent), '[vite.config.ts] manualChunks configures web-llm separation');
  assert(/manualChunks:\s*\{[\s\S]*'vendor-react':\s*\[\s*['"]react['"],\s*['"]react-dom['"]\s*\]/.test(viteContent), '[vite.config.ts] manualChunks configures vendor-react separation');
  assert(/manualChunks:\s*\{[\s\S]*'vendor-ui':\s*\[\s*['"]framer-motion['"],\s*['"]lucide-react['"]\s*\]/.test(viteContent), '[vite.config.ts] manualChunks configures vendor-ui separation');
}

console.log('\n================================================================');
console.log('CHALLENGER M4 EMPIRICAL TEST SUMMARY');
console.log('================================================================');
console.log(`TOTAL EMPIRICAL TESTS : ${passedTests + failedTests}`);
console.log(`PASSED                : ${passedTests}`);
console.log(`FAILED                : ${failedTests}`);

if (failedTests > 0) {
  console.error('\nCHALLENGE VERDICT: REQUEST_CHANGES (Defects detected in bundle or configuration)');
  process.exit(1);
} else {
  console.log('\nCHALLENGE VERDICT: APPROVE (All Milestone 4 requirements empirically verified with 0 defects)');
}

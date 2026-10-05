import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import ts from 'typescript';

for (const file of ['mcp-bridge.ts', 'mcp-bridge.mjs']) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('function getUserDataPath');
  const end = source.indexOf('async function main', start);
  function config(token?: string) {
    const readFiles: string[] = [];
    const code = ts.transpileModule(source.slice(start, end) + '\nresolveMcpConfig();', {
      compilerOptions: { target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const result = vm.runInNewContext(code, {
      os, path, process: { platform: 'darwin', env: { MCP_TOKEN: token } },
      fs: { existsSync: () => true, readFileSync: (name: string) => { readFiles.push(name); return name.endsWith('nova-mcp-port') ? '3020' : 'NMCP encrypted ciphertext'; } }
    });
    assert.ok(readFiles.every(name => !name.endsWith('nova-mcp-token')), 'standalone Node must never read an encrypted token as plaintext');
    return result;
  }
  assert.throws(() => config(), /MCP_TOKEN/, `${file} must explain the missing explicit token before connecting`);
  assert.equal(config('12345678-1234-1234-1234-123456789abc').token, '12345678-1234-1234-1234-123456789abc');
  assert.throws(() => config('malicious\r\nheader'), /MCP_TOKEN/, 'invalid header characters must be rejected');
}
console.log('[PASS] Standalone MCP bridge credential configuration');

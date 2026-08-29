import assert from 'node:assert/strict';

console.log('\n--- AI Agent Tool Calling & Schema Security Suite ---');

const ALLOWED_TOOLS = new Set([
  'navigate_to_url',
  'click_element',
  'fill_input',
  'scroll_page',
  'summarize_page',
  'search_history',
  'create_tab',
  'close_tab',
  'switch_workspace'
]);

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

function validateToolCall(call: ToolCall): { valid: boolean; error?: string } {
  if (!call || typeof call.name !== 'string') {
    return { valid: false, error: 'Invalid tool invocation object' };
  }

  if (!ALLOWED_TOOLS.has(call.name)) {
    return { valid: false, error: `Tool ${call.name} is not permitted` };
  }

  const args = call.args || {};

  // Schema-specific validation
  if (call.name === 'navigate_to_url') {
    if (typeof args.url !== 'string' || !args.url.trim()) {
      return { valid: false, error: 'Missing or invalid URL argument' };
    }
    const dangerous = ['javascript:', 'data:', 'file:', 'vbscript:'];
    if (dangerous.some(d => args.url.toLowerCase().trim().startsWith(d))) {
      return { valid: false, error: 'Dangerous protocol blocked in AI navigation' };
    }
  }

  if (call.name === 'click_element' || call.name === 'fill_input') {
    if (typeof args.selector !== 'string' && typeof args.index !== 'number') {
      return { valid: false, error: 'DOM action requires selector or numeric index' };
    }
  }

  if (call.name === 'scroll_page') {
    if (args.direction && !['up', 'down', 'top', 'bottom'].includes(args.direction)) {
      return { valid: false, error: 'Invalid scroll direction' };
    }
  }

  return { valid: true };
}

// 1. Valid Tool Calls
assert.deepEqual(validateToolCall({ name: 'navigate_to_url', args: { url: 'https://docs.anthropic.com' } }), { valid: true });
assert.deepEqual(validateToolCall({ name: 'click_element', args: { selector: '#submit-btn' } }), { valid: true });
assert.deepEqual(validateToolCall({ name: 'scroll_page', args: { direction: 'down' } }), { valid: true });
assert.deepEqual(validateToolCall({ name: 'summarize_page', args: {} }), { valid: true });

// 2. Reject Disallowed / Arbitrary Tools
assert.equal(validateToolCall({ name: 'execute_shell_command', args: { cmd: 'rm -rf /' } }).valid, false);
assert.equal(validateToolCall({ name: 'read_filesystem', args: { path: '/etc/passwd' } }).valid, false);

// 3. Reject Malicious Arguments
assert.equal(validateToolCall({ name: 'navigate_to_url', args: { url: 'javascript:alert(1)' } }).valid, false);
assert.equal(validateToolCall({ name: 'navigate_to_url', args: { url: 'file:///etc/hosts' } }).valid, false);
assert.equal(validateToolCall({ name: 'scroll_page', args: { direction: 'invalid-dir' } }).valid, false);

console.log('[PASS] [AI Agent Tools] Tool allowlist, DOM argument constraints, and dangerous payload rejection verified.');

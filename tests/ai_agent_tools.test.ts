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
import { detectDirectIntent } from '../src/services/aiAgent';

// 4. Test Natural Language Direct Intent Extractor
const intentHn = detectDirectIntent('hackernews aç');
assert.equal(intentHn?.name, 'navigate_to_url');
assert.equal(intentHn?.arguments?.url, 'https://news.ycombinator.com');

const intentGh = detectDirectIntent('github unitybtw/nova-browser aç');
assert.equal(intentGh?.name, 'navigate_to_url');
assert.equal(intentGh?.arguments?.url, 'https://github.com/unitybtw/nova-browser');

const intentWiki = detectDirectIntent('wikipedia web browser');
assert.equal(intentWiki?.name, 'navigate_to_url');
assert.equal(intentWiki?.arguments?.url?.includes('wikipedia.org'), true);

const intentScroll = detectDirectIntent('en alta kaydır');
assert.equal(intentScroll?.name, 'scroll_page');
assert.equal(intentScroll?.arguments?.direction, 'bottom');

const intentHistory = detectDirectIntent('geçmişte github ara');
assert.equal(intentHistory?.name, 'search_history');
assert.equal(intentHistory?.arguments?.query, 'github');

const intentTab = detectDirectIntent('yeni sekme aç');
assert.equal(intentTab?.name, 'manage_tabs');
assert.equal(intentTab?.arguments?.action, 'create');

console.log('[PASS] [AI Agent Tools] Tool allowlist, DOM constraints, and detectDirectIntent natural language parsing verified.');

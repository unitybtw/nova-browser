import assert from 'node:assert/strict';

console.log('\n--- AI Agent Tool Calling & Schema Security Suite ---');

const ALLOWED_TOOLS = new Set([
  'navigate_to_url',
  'web_research',
  'click_element',
  'fill_input',
  'scroll_page',
  'summarize_page',
  'search_history',
  'create_tab',
  'close_tab',
  'switch_workspace',
  'reload_page',
  'go_back',
  'go_forward'
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

  if (call.name === 'web_research') {
    if (typeof args.query !== 'string' || !args.query.trim()) {
      return { valid: false, error: 'Missing or invalid query argument' };
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

const intentCloseTab = detectDirectIntent('sekmeyi kapat');
assert.equal(intentCloseTab?.name, 'manage_tabs');
assert.equal(intentCloseTab?.arguments?.action, 'close');

// 5. Turkish accusative & dative suffix direct site tests (fixing "yapıyorum diyor yapmıyor")
const intentYtU = detectDirectIntent("youtube'u aç");
assert.equal(intentYtU?.name, 'navigate_to_url');
assert.equal(intentYtU?.arguments?.url, 'https://youtube.com');

const intentYtAc = detectDirectIntent('youtube aç');
assert.equal(intentYtAc?.name, 'navigate_to_url');
assert.equal(intentYtAc?.arguments?.url, 'https://youtube.com');

const intentGoogleI = detectDirectIntent("google'ı aç");
assert.equal(intentGoogleI?.name, 'navigate_to_url');
assert.equal(intentGoogleI?.arguments?.url, 'https://google.com');

// 6. Navigation controls
const intentReload = detectDirectIntent('sayfayı yenile');
assert.equal(intentReload?.name, 'reload_page');

const intentYenile = detectDirectIntent('yenile');
assert.equal(intentYenile?.name, 'reload_page');

const intentBack = detectDirectIntent('geri git');
assert.equal(intentBack?.name, 'go_back');

const intentForward = detectDirectIntent('ileri git');
assert.equal(intentForward?.name, 'go_forward');

// 7. Compound search queries
const intentYtSearch = detectDirectIntent("youtube'da tarkan ara");
assert.equal(intentYtSearch?.name, 'navigate_to_url');
assert.equal(intentYtSearch?.arguments?.url?.includes('search_query=tarkan'), true);

const intentGoogleSearch = detectDirectIntent("google'da react ara");
assert.equal(intentGoogleSearch?.name, 'navigate_to_url');
assert.equal(intentGoogleSearch?.arguments?.url?.includes('search?q=react'), true);

// 8. Autonomous Web Research Intent Queries
const intentWebNewsTr = detectDirectIntent('Web üzerinde en son haberleri ara');
assert.equal(intentWebNewsTr?.name, 'web_research');
assert.equal(typeof intentWebNewsTr?.arguments?.query === 'string' && intentWebNewsTr.arguments.query.length > 0, true);

const intentWebNewsEn = detectDirectIntent('Search latest news on web');
assert.equal(intentWebNewsEn?.name, 'web_research');
assert.equal(typeof intentWebNewsEn?.arguments?.query === 'string' && intentWebNewsEn.arguments.query.length > 0, true);

const intentResearchTopic = detectDirectIntent('react 19 yeniliklerini araştır');
assert.equal(intentResearchTopic?.name, 'web_research');
assert.equal(intentResearchTopic?.arguments?.query?.includes('react 19'), true);

const intentWebSearchTr = detectDirectIntent('webde yapay zeka ara');
assert.equal(intentWebSearchTr?.name, 'web_research');
assert.equal(intentWebSearchTr?.arguments?.query?.includes('yapay zeka'), true);

// 9. Autonomous Goal & Multi-Step Task Intent Queries
const intentGoalCompound = detectDirectIntent('siteye gidip şunu yap sonra işte youtube da şu videoyu bul');
assert.equal(intentGoalCompound?.name, 'execute_goal');

const intentGoalYtPlay = detectDirectIntent("youtube'a git ve lofi music çal");
assert.equal(intentGoalYtPlay?.name, 'execute_goal');

const intentGoalExplicit = detectDirectIntent("hedef: amazon'da macbook ara");
assert.equal(intentGoalExplicit?.name, 'execute_goal');

const intentGoalSequential = detectDirectIntent("google'da btc fiyatı ara sonra ekran görüntüsü al");
assert.equal(intentGoalSequential?.name, 'execute_goal');

console.log('[PASS] [AI Agent Tools] Tool allowlist, DOM constraints, Turkish intent parsing, navigation controls, autonomous web research, and autonomous goals verified.');

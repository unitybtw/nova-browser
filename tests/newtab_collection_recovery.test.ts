import assert from 'node:assert/strict';
import { parseTodos } from '../src/components/NewTabPage';
import { parseFavoriteApps } from '../src/components/SidebarTabs';

assert.deepEqual(parseFavoriteApps('[]'), [], 'an intentionally empty favorite list must remain empty');
assert.equal(parseFavoriteApps('{}'), null, 'an invalid root must fall back to defaults');
const favorites = parseFavoriteApps(JSON.stringify([
  null, { id: 'bad', url: 'javascript:alert(1)' },
  { id: 'valid', name: 'Docs', url: 'https://example.com/docs', iconType: 'unknown' },
  { id: 'valid', name: 'Duplicate ID', url: 'https://example.com/other' },
  { id: 'bad-name', name: {}, url: 'https://example.com' }
]))!;
assert.equal(favorites.length, 1);
assert.equal(favorites[0].iconType, 'custom', 'unknown icons have a visible fallback');
const todos = parseTodos(JSON.stringify([
  null, 7, { id: 'a', text: 'First', completed: true },
  { id: 'b', text: 'Second', completed: 'false' },
  { id: 'a', text: 'Duplicate', completed: false },
  { id: 'bad', text: { nested: 'invalid' } }, { text: 'Legacy task' }
]))!;
assert.equal(todos.length, 3, 'valid tasks survive malformed rows');
assert.equal(todos[0].completed, true);
assert.equal(todos[1].completed, false, 'a string must not mark a task completed');
assert.ok(todos[2].id, 'legacy text-only tasks receive an ID');
assert.equal(parseTodos('{}'), null);
assert.deepEqual(parseTodos('[]'), []);
console.log('[PASS] New tab task and sidebar favorite recovery, empty lists, duplicate IDs and icon fallback');

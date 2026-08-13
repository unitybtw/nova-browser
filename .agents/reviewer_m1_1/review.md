# Review Report — Backend & Main Process (Reviewer 1)

## Review Summary

**Verdict**: APPROVE

Worker M1 successfully addressed all backend, main process, and bridge issues identified for Milestone 1. The memory leak fix for `upgradedUrls` correctly bounds Set growth to 1,000 entries using FIFO eviction, redundant `context-menu` event listeners are removed prior to registration, CORS headers on `electron/mcpServer.ts` are strictly restricted to local origins (`localhost`, `127.0.0.1`, `nova:`), and TypeScript compilation succeeds with 0 errors across `npm run build`. No integrity violations or facade implementations were found.

---

## Findings

### Minor Finding 1 (Performance / Optimization Note)
- **What**: The FIFO eviction logic in `addUpgradedUrl` uses `upgradedUrls.values().next().value` to remove the oldest URL when `upgradedUrls.size >= MAX_UPGRADED_URLS`.
- **Where**: `electron/main.ts:269-277`
- **Why**: While `Set.prototype.values().next().value` operates in O(1) time in V8, Set insertion order is preserved unless an existing item is re-added without deletion. Since `addUpgradedUrl` is only invoked when `upgradedUrls.has(navigationUrl)` is false, insertion order corresponds strictly to discovery order.
- **Suggestion**: The current implementation is simple, robust, and correctly caps memory at 1,000 items. No changes required for Milestone 1.

---

## Verified Claims

1. **`upgradedUrls` Memory Leak Fix**
   - **Claim**: Bounded `upgradedUrls` Set to max 1,000 items using FIFO eviction.
   - **Method**: Verified code at `electron/main.ts:265-277` & `electron/main.ts:513`.
   - **Result**: PASS. Growth is strictly capped; `addUpgradedUrl()` evicts the oldest entry when `size >= 1000`.

2. **`context-menu` Event Listener Accumulation**
   - **Claim**: Prevents duplicate/redundant context-menu listener registration.
   - **Method**: Verified `wc.removeAllListeners('context-menu')` at `electron/main.ts:601` before `wc.on('context-menu', ...)`.
   - **Result**: PASS. Guarantees a clean single listener per `WebContents`.

3. **CORS Header Security on MCP Server**
   - **Claim**: Restricted wildcard `*` CORS origin to local origins only (`localhost`, `127.0.0.1`, `nova:`).
   - **Method**: Verified origin validation middleware in `electron/mcpServer.ts:477-494`. Tested attack vectors (`https://evil.com`, `http://localhost.attacker.com`).
   - **Result**: PASS. External sites cannot access local MCP API endpoints.

4. **`mcp-bridge.ts` EventSource Import Fix**
   - **Claim**: Resolved TS module import error for `eventsource`.
   - **Method**: Inspected `mcp-bridge.ts:8-11`.
   - **Result**: PASS. Modern ES/CJS interop pattern resolves TS2339 cleanly.

5. **Build & TypeScript Compilation**
   - **Claim**: Clean compilation with 0 TypeScript errors.
   - **Method**: Executed `export PATH=/Users/siracsimsek/.nvm/versions/node/v26.6.0/bin:$PATH && npm run build`.
   - **Result**: PASS. `tsc`, `vite build`, and `esbuild` completed with 0 errors.

---

## Coverage Gaps

- None. All main process and MCP backend files modified in Milestone 1 were reviewed and verified.

---

## Unverified Items

- None. All relevant claims have been independently verified via code inspection and build execution.

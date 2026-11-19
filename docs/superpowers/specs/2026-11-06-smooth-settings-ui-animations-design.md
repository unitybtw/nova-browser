# Design Spec: Smooth Animated Settings UI Expansion

## Problem Statement
When toggles or selection cards in Nova Browser's Settings (e.g. AI provider selection, tab hibernation toggle, connection test results) are activated, the newly revealed child UIs currently pop in instantaneously. This causes abrupt vertical layout shifts and visual jank.

## Solution Architecture
Create a dedicated, reusable, GPU-accelerated collapsible component `SmoothCollapse` utilizing modern CSS Grid transition (`grid-template-rows: 0fr -> 1fr`) with coordinated opacity and slight vertical translation. Integrate this across all conditional settings surfaces.

## Technical Details

### 1. `SmoothCollapse.tsx` Component
- File: `src/components/settings/SmoothCollapse.tsx`
- Strategy: CSS Grid transition on `grid-template-rows`.
  - Outer: `grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none`
  - When open: `grid-rows-[1fr]`
  - When closed: `grid-rows-[0fr]`
  - Inner: `overflow-hidden min-h-0 transition-all duration-200 ease-out`
  - Inner open state: `opacity-100 translate-y-0`
  - Inner closed state: `opacity-0 -translate-y-1`
- Accessibility: Respects `motion-reduce:transition-none` and `aria-hidden={!isOpen}`.

### 2. Integration Target Surfaces
1. `src/components/settings/AdvancedSection.tsx`:
   - Custom AI Provider configuration parameters panel (`settings.aiProvider === 'custom'`).
   - Tab Hibernation inactivity timeout row (`settings.tabHibernationEnabled`).
   - Connection test results banner (`testResult`).
   - Memory purge feedback notification (`purgedFeedback`).
2. `src/components/settings/PrivacySection.tsx`:
   - Whitelist error notification banner.
3. `src/components/settings/SyncSection.tsx`:
   - Connection status / error messages.
4. `src/components/settings/AppearanceSection.tsx`:
   - Custom wallpaper override action bar.

## Verification & Testing
- Zero TypeScript errors (`npx tsc --noEmit`).
- All existing tests pass (`npm test`, `dist-test/litellm.cjs`, `dist-test/challenger.cjs`).
- Graphify knowledge graph updated (`graphify update .`).

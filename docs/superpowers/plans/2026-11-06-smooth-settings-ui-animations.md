# Implementation Plan: Smooth Animated Settings UI Expansion

## Task 1: Create `SmoothCollapse` Component
- **File**: `src/components/settings/SmoothCollapse.tsx`
- **Goal**: Reusable zero-JS-height CSS Grid collapsible with smooth fade, slide, and hardware acceleration.
- **Details**:
  - Accept `isOpen: boolean`, `children: React.ReactNode`, `className?: string`, `durationMs?: number`.
  - Outer element with `grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none`.
  - Conditional class: `isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'`.
  - Inner container: `overflow-hidden min-h-0 transition-all duration-200 ease-out`, with `isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'`.

## Task 2: Integrate `SmoothCollapse` in `AdvancedSection.tsx`
- **File**: `src/components/settings/AdvancedSection.tsx`
- **Surfaces**:
  - Custom AI Provider parameters panel (`settings.aiProvider === 'custom'`).
  - Connection test result banner (`testResult !== null`).
  - Hibernation timeout row (`settings.tabHibernationEnabled`).
  - Instant memory purge feedback notice.

## Task 3: Integrate `SmoothCollapse` in `PrivacySection.tsx` & `AppearanceSection.tsx`
- **Files**:
  - `src/components/settings/PrivacySection.tsx` (adblock whitelist error and notice)
  - `src/components/settings/AppearanceSection.tsx` (custom wallpaper override action bar)

## Task 4: Verify and Test
- Run `npx tsc --noEmit` to verify type safety.
- Run `npm test` and custom test suites.
- Run `graphify update .` to update knowledge graph.
- Commit only source code files (exclude markdown files per project rules).

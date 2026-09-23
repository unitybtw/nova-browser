# Browser AI Model Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve readability, spacing, accessibility, and visual polish of the Browser AI first-run model chooser.

**Architecture:** Keep all UI work in the existing first-run branch of `src/components/SidePanel.tsx`. Reuse `selectedModelId`, `setSelectedModelId`, the existing model metadata, `handleInit`, and the existing progress/error rendering. Do not change AI behavior or model definitions.

**Tech Stack:** React, TypeScript, Tailwind utility classes, lucide-react icons, existing Nova theme tokens.

## Global Constraints

- Preserve the current dark theme, blue accent, and typography.
- Keep scope limited to the first-run model selection/initialization branch.
- Keep current model names, descriptions, size estimates, initialization, progress, and error behavior.
- Add no dependencies and do not run tests unless requested.

---

### Task 1: Refine the first-run chooser

**Files:**
- Modify: `src/components/SidePanel.tsx` (first-run branch near the current model selector)

**Interfaces:**
- Consumes: `AVAILABLE_AI_MODELS`, `selectedModelId`, `setSelectedModelId`, `aiAgent.setModel`, `isInitializing`, `progress`, `progressText`, `initError`, `handleInit`.
- Produces: A more compact, top-aligned onboarding layout with keyboard-accessible model selection and a clear size-aware primary action. No exported interface changes.

- [ ] Replace vertical center alignment with a top-aligned, height-aware layout; use spacing that keeps the heading, model options, and primary action within the narrow panel.
- [ ] Improve text hierarchy and spacing within each model option, preserving all current factual copy and metadata; allow long titles and metadata to wrap without horizontal overflow.
- [ ] Implement a radio group using native radio inputs or equivalent ARIA radio semantics; ensure arrow/space keyboard selection, tab focus, visible focus styling, and selected state that includes a non-color indicator.
- [ ] Preserve `setSelectedModelId` and `aiAgent.setModel` behavior when selection changes; ensure the primary action continues to show the selected model size.
- [ ] Preserve existing loading progress and error UI, adapting spacing only as needed.
- [ ] Review the rendered result in the running Electron app at its existing side-panel width; fix any clipping, awkward wrapping, or excessive unused vertical space.
- [ ] Run `npm run build` and report the result. Do not run the test suite unless requested.

**Acceptance check:** The first-run panel is top-aligned, readable at 384px, can be operated by pointer and keyboard, visibly communicates selection/focus, and retains the existing selected-size CTA, progress, and errors.

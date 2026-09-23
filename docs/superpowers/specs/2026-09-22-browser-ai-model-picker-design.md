# Browser AI Model Picker Design

## Goal

Polish the Browser AI first-run model selection screen so model choice is clear, readable, and comfortable to use in the narrow side panel.

## Scope

Only the model selection and initialization area in `src/components/SidePanel.tsx` is in scope. Chat, memory, and toolbar UI stay as they are. Existing model options, descriptions, download sizes, initialization behavior, progress, and error handling remain authoritative and functional.

## Design

- Preserve Nova's current dark surfaces, blue accent, and typography.
- Align the onboarding content toward the top to reduce the large unused space above it.
- Make model choices larger and easier to scan, with clearer text hierarchy and consistent size/speed metadata.
- Use keyboard-operable radio semantics, visible focus, and a selected indicator that does not depend on color alone.
- Keep one clear primary action that names the currently selected model's download size. Preserve the existing loading and error states.

## Interaction and accessibility

Each model is a single selectable option; pointer and keyboard input update the same selection. The selected value is exposed to assistive technology. Focus remains visible. While initialization is active, model choices remain hidden as they are today and progress remains visible.

## Acceptance criteria

1. The first-run view uses the available panel height without the current oversized top void.
2. Model names, descriptions, size, and speed remain readable and distinguishable at the existing panel width.
3. Every model can be selected with pointer and keyboard, with a visible selected state and focus state.
4. The primary action shows the selected model's size and retains its existing initialization behavior.
5. Loading progress and initialization errors remain visible and usable.

## Self-review

The scope is limited to one existing UI branch and does not alter model data or initialization APIs. Requirements are concrete and correspond to the existing component state and controls; there are no placeholders or conflicting behaviors.

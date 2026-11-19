# Native macOS / Linear Inspector Redesign — Live Design Studio & Appearance Section

## Goal
Eliminate generic "AI slop" styling (blue-indigo-purple hero gradients, `<Sparkles />` badges, neon-blue pill tabs, nested boxes-within-boxes, and the floating bottom pulsing-green-dot pill bar) across both the **Live Design Studio** and **Settings → Appearance**, replacing them with a calm, high-precision **Native macOS / Linear Inspector** interface.

## Architecture
1. **Shared Wireframe Preview (`src/components/customization/ChromeMiniPreview.tsx`):**
   - Renders accurate miniature browser geometry for all 4 chrome modes (`classic-top` above/below toolbar, `compact-single-row`, `vertical-left`, `vertical-right`) with optional template surface/accent swatches.
   - Reused in both `DesignStudioDrawer` (Themes + Layout tabs) and `AppearanceSection` (Starter Layouts grid).
2. **Edge-Docked Inspector (`src/components/customization/DesignStudioDrawer.tsx`):**
   - Anchored flush to the left or right window edge (`bottom-0`, `right-0`/`left-0`, `w-[348px]`) with neutral surfaces (`#ffffff` light / `#111214` dark) and `1px` neutral hairline separators.
   - **Header:** Clean `Design Studio` title, current scope subtitle, dock-side toggle, and close button.
   - **Tabs:** Linear-style text tabs (`Themes`, `Layout`, `Style`, `New Tab`) with a sharp `2px` underline indicator instead of icon-topped blue pills.
   - **Flat Hairline-Divided Body:** Zero nested rounded cards; sections separated cleanly with `divide-y`.
   - **Integrated Sticky Footer:** `Undo`, `Reset`, `Cancel`, and `Save` live directly at the bottom of the docked inspector, removing the floating bottom pill (`CustomizeTopBanner`) from `src/App.tsx`.
3. **Native Appearance Settings Block (`src/components/settings/AppearanceSection.tsx`):**
   - Replaces the gradient hero box with a crisp 3-row native settings block: (1) `Design Studio` launcher row with current layout summary and `Customize Browser` (`⌘⇧E`) button, (2) 3-column visual Starter Layouts grid using `ChromeMiniPreview`, and (3) quiet inline utility bar (`Export`, `Import`, optional `Clear Workspace Override`, `Reset Defaults`).

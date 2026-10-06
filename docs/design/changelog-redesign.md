# Nova release journal

The changelog becomes an in-browser release journal, with a permanent version rail, a selected-release story, a large media stage, an interactive update walkthrough, and a searchable list of every change. It inherits Nova's slate/cobalt palette and light/dark preferences. Avoid animated glows, decorative statistics, and repetitive icon cards.

Keep every bundled and live release. GitHub synchronization continues through the existing cache and shared refresh service. Text from release notes remains factual; curated media is attached to matching versions only. New live releases without curated media remain fully readable.

The latest release includes actual new-tab/assistant screenshots, the existing product film, and a new short update explainer. Photos switch in place; videos have controls, captions, no autoplay, and stop when their release/media is changed. The update walkthrough is explicitly explanatory, never a simulated live download. A separate current-status panel uses the existing desktop UpdateWidget; web preview clearly says desktop updating is unavailable there.

Implementation:
1. Replace ChangelogPage and add scoped CSS and localized interface copy.
2. Add a media manifest and local assets; render the update explainer with Remotion.
3. Preserve live refresh, version selection, search, categories, navigation, and keyboard access. Guard late async results after unmount.
4. Verify renderer/Electron builds, existing tests, and the page's media, filtering, theme, and narrow-layout behavior in the browser. Commit/push in English.

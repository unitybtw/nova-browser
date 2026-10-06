---
name: Nova release journal
description: Implemented changelog surface with real release media, readable notes, and explicit update guidance.
colors:
  journal-bg: "#f8f9fb"
  journal-surface: "#fff"
  journal-ink: "#202733"
  journal-muted: "#586478"
  journal-line: "#dde2e9"
  journal-accent: "#245de1"
  journal-wash: "#eaf0fc"
  journal-stage: "#e7ebf1"
  journal-bg-dark: "#11151d"
  journal-surface-dark: "#171d27"
  journal-ink-dark: "#eef1f6"
  journal-muted-dark: "#a5afbf"
  journal-line-dark: "#303a49"
  journal-accent-dark: "#8bacff"
  journal-wash-dark: "#222f48"
  journal-stage-dark: "#1b2330"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif'
    fontSize: "clamp(42px, 5vw, 68px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontSize: "14px"
    lineHeight: 1.6
  action:
    fontSize: "12px"
    fontWeight: 600
rounded:
  compact: "6px"
  control: "8px"
  media: "12px"
  circle: "50%"
spacing:
  compact: "6px"
  inline: "12px"
  inset: "16px"
  section: "64px"
  section-narrow: "42px"
components:
  version-selected:
    backgroundColor: "{colors.journal-wash}"
    textColor: "{colors.journal-accent}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  text-action:
    textColor: "{colors.journal-accent}"
    typography: "{typography.action}"
    padding: "0"
  media-choice-selected:
    backgroundColor: "{colors.journal-ink}"
    textColor: "{colors.journal-bg}"
    rounded: "{rounded.compact}"
    padding: "8px 11px"
  search:
    backgroundColor: "{colors.journal-surface}"
    textColor: "{colors.journal-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  media-stage:
    backgroundColor: "{colors.journal-stage}"
    rounded: "{rounded.media}"
    padding: "16px"
---

# Design System: Nova release journal

## Overview

**Creative North Star: "Nova release journal"**

This is a record of the implemented changelog surface, not a global identity replacement. A persistent version selector leads into a selected release, real product media, highlights, update guidance, and searchable notes. Quiet slate surfaces and cobalt actions follow Nova's light/dark preference and existing logo. Large regular-weight headings provide hierarchy without decorative statistics or repeated icon cards.

Implementation authority is `src/components/ChangelogPage.tsx` and `src/components/changelog/*`; durable product constraints come from `PRODUCT.md`. `docs/design/changelog-redesign.md` records direction, while this document records shipped component behavior. The neighboring `design.json` carries extensions and static component previews; React remains authoritative for interaction and runtime state.

**Key Characteristics:**

- Version-first navigation with a readable, scrollable release story.
- Real media attached to its matching release.
- Flat tonal layers, fine dividers, and restrained action color.
- Explicit separation between explanatory update steps and actual device status.

## Colors

### Primary

Cobalt (`journal-accent`) marks actions, selected versions and filters, focus, and security labels. The dark theme uses the lighter cobalt counterpart. The wash provides a quiet selection background rather than a glow.

### Neutral

The background and surface distinguish the journal body from its header and controls. Ink carries primary content; muted slate carries dates, captions, descriptions, and categories. Line supplies dividers and control borders. Stage gives screenshots and films a neutral matte. Dark counterparts replace all eight local variables under the inherited `.dark` ancestor; components consume the same variable names in either theme.

**The Local Palette Rule.** Keep journal variables scoped to the release journal; do not redefine the application's global theme through this surface.

## Typography

All journal text and headings inherit Nova's system sans stack. The global serif heading treatment is explicitly overridden within this surface. Display, headline, title, body, and action roles are recorded above; secondary sizes are component-specific rather than a new global type scale.

The release display balances across lines, with a smaller muted subtitle beneath it. The release title is limited to a readable width (780px), and the introductory paragraph to 74 characters per line. Introductory prose uses generous leading (1.85). Dates, counters, category labels, and media labels are smaller than notes; version numbers and counts use tabular numerals. At narrow widths the display settles at 42px, title at 21px, and introductory prose at 13px.

## Layout

The journal fills its host height and width. Its header stays above a two-column grid: a version rail (210px) and a flexible story column. Rail and story scroll independently. Story sections share a maximum width (1050px), with responsive horizontal inset (`clamp(24px, 4.5vw, 80px)`). Large sections use the recorded section spacing; fine horizontal dividers organize notes and update guidance.

At 1050px and below, the rail narrows (165px), highlights become one column, update status stacks below the walkthrough, and the media stage changes from 16:10 to 16:11. At 650px and below, the rail becomes a horizontal scrolling version strip, the title and source label disappear, and the refresh button remains visible beside the strip. Story inset becomes 27px vertically and 20px horizontally; media becomes 4:3, notes become single-column rows, and section separation uses the narrow spacing token. Filters and media choices wrap instead of overflowing.

## Elevation & Depth

The journal's own CSS uses no box shadows. Depth comes from matte stage color, solid surfaces, selection washes, borders, and whitespace. The embedded existing UpdateWidget retains its own presentation. Its local wrapper allows inline status/action rows to wrap while excluding fixed overlays from those row rules.

## Shapes

Compact choices and refresh controls use gently rounded corners; version buttons and search use the larger control radius. The media frame uses the media radius, and fitted media has a smaller inner radius (7px). Media arrows are circular controls (30px diameter). Notes and highlight rows are flat divided lists rather than boxed cards.

## Components

### Version navigation and refresh

Each native button shows a version and date. The selected version uses `aria-current`; the installed version has a check mark, and the first release receives a latest label. Narrow navigation hides dates and latest labels. Selecting a release resets category and search and moves the story scroll to its start. Refresh uses the existing shared service, disables while loading, and rotates its icon unless reduced motion is requested. A failed refresh has an alert; cached or bundled notes remain readable. Late request results are guarded after unmount.

### Media stage

Version 1.5.0 has four curated choices: new-tab screenshot, assistant screenshot, product film, and update guide. Other versions derive image media from their existing hero and section media. Releases without media omit the stage. The actual release data and changelog service remain unchanged.

Images and videos fit inside the stage without cropping. Named choices use `aria-pressed`, support left/right arrow selection with focus movement, and complement previous/next controls and a count. The active caption is announced politely. Videos have native controls, posters, inline playback, and no autoplay; playback pauses before a gallery change and during cleanup when media or release changes. Both films have English/Turkish caption tracks selected by locale, with English fallback for other locales.

### Update walkthrough and device status

The walkthrough is a labeled three-step explanation, with native buttons in a labeled group and `aria-pressed` on the selected step. A persistent Next step button cycles through all three explanations and retains keyboard focus because its containing detail is not remounted. The explanatory note identifies the illustration; no simulated download state is presented as live status.

A separate device panel renders the real existing UpdateWidget only when desktop updater IPC is available. Ordinary web preview shows an explicit desktop-only explanation and a releases link. The scoped wrapper wraps inline updater content and preserves fixed overlays. Download and installation behavior remains owned by the existing widget and Electron updater.

### Search, filters, and notes

Search has an accessible label, a clear action when populated, and accent border on focus within. Category buttons form a labeled group and use `aria-pressed`; they combine with case-insensitive text search. Counts reflect the selected release's filtered and total change counts. Empty results offer a clear-filters action. Rows keep category separate from change text on wide screens and stack them on narrow screens.

### Actions and focus

Opening actions, feedback, and releases links are restrained text actions with directional icons. Journal buttons, links, and inputs receive an accent focus outline (2px, offset 4px). Disabled controls reduce opacity and use the waiting cursor. Step content has a short arrival animation; reduced-motion preference suppresses it and the refresh rotation.

## Do's and Don'ts

### Do:

- **Do** use the scoped light/dark palette and inherited system sans typography.
- **Do** keep release media tied to its matching version and preserve historic notes.
- **Do** keep the walkthrough explanatory and actual updater state in the device panel.
- **Do** retain visible focus, localized captions, manual video playback, and narrow refresh access.

### Don't:

- **Don't** introduce glows, decorative statistics, or repetitive icon cards into this journal.
- **Don't** show the v1.5.0 curated gallery for unrelated releases.
- **Don't** remount the Next step control on a step change or style fixed updater overlays as inline rows.
- **Don't** treat the web fallback as desktop updater functionality.

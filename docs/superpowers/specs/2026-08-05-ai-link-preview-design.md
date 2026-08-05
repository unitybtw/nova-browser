# AI Link Hover Preview Showcase Design

## Overview
Nova Browser features an AI-powered link preview system where users can hover over any link, and after a short delay (1.5s), an AI-generated summary of the target page appears. This document specifies how we will showcase this feature on the landing page using an interactive HTML/CSS mockup.

## Architecture & Integration
- **Target File:** `website/src/components/FeatureShowcase.tsx`
- **New Component:** `website/src/components/mockups/LinkPreviewMockup.tsx`
- We will replace one of the existing features (e.g., Split Screen) or add a 5th feature to the `showcaseConfigs` to demonstrate the "AI Link Preview" functionality.

## UX & Animation Flow (Framer Motion)
1. **Initial State:** A browser window mockup showing a realistic article ("The Future of AI").
2. **Cursor Animation:** A fake mouse cursor (SVG) moves into the frame and stops exactly over a hyperlinked text snippet (`<a>` tag styled in blue).
3. **Delay (Hover State):** The cursor waits for 1.5 seconds. The link might show a subtle glowing or loading state to indicate the AI is processing.
4. **Tooltip Appearance:** A frosted-glass (glassmorphism) tooltip pops up smoothly (using a `spring` animation) right below the cursor.
5. **Typing Effect:** Inside the tooltip, a text summary is generated character by character to simulate real-time AI inference.

## Technical Details
- **Styling:** Exaggerated Minimalism, matching the current theme (White/Navy/Gold).
- **Icons:** We will use `Lucide-react` (e.g., `MousePointer2` for the cursor, `Sparkles` for the AI tooltip).
- **Dependencies:** Uses existing `framer-motion` library. No new dependencies required.

## Testing & Verification
- Ensure the animation loops naturally or triggers when the mockup scrolls into view (`whileInView`).
- Ensure it looks good on both desktop and mobile viewports (tooltip positioning must stay within the mockup bounds).

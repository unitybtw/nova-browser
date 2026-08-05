# Nova Browser Onboarding Design Spec

## 1. Goal
Modernize the existing `Onboarding.tsx` component by implementing a "Glassmorphism & Depth" aesthetic. The goal is to make the first impression of Nova Browser feel premium, fluid, and native (especially for macOS users).

## 2. Visual Aesthetic (Glassmorphism)
- **Background**: Replace the solid gradient with deep, dark base colors combined with large, blurred, animated "blobs" (e.g., a blue blob and a violet blob moving slowly in the background).
- **Cards/Containers**: Use `backdrop-blur-xl`, semi-transparent backgrounds (e.g., `bg-white/10` or `bg-slate-900/50`), and subtle inner borders (`border border-white/20`).
- **Typography**: Emphasize contrast. Use crisp, modern sans-serif fonts with soft gradients for primary headers.
- **Shadows**: Use diffuse, colored shadows (`shadow-blue-500/20`) to create depth.

## 3. Interaction & Animation
- **Transitions**: Use Framer Motion's `spring` physics (e.g., `type: 'spring', damping: 25, stiffness: 300`) for slide transitions instead of linear tweens.
- **Hover States**: Interactive elements (theme cards, search engines) will slightly scale up (`scale: 1.02`), their border opacity will increase, and their drop-shadow will glow on hover.
- **Click States**: A subtle `scale: 0.98` on click to provide tactile feedback.
- **Progress Indicator**: A sleek, glowing progress bar or modern stepped dots at the bottom.

## 4. Content Structure
The 6 existing steps will remain, but their layouts will be rebuilt with the new design tokens:
1. **Welcome**: Glowing Nova icon, animated typography.
2. **Import Bookmarks**: A frosted glass card with an animated import icon.
3. **Theme**: 3 glass cards for Light, Dark, System themes. Selected card glows.
4. **Search Engine**: A vertical list of frosted pill-shaped buttons with engine logos.
5. **Privacy Shield**: A central glowing shield icon surrounded by glass badges for Ads, Trackers, Malware.
6. **Done**: A celebratory "blast" animation, summarizing choices on a glass pane.

## 5. Technical Implementation
- Target File: `src/components/Onboarding.tsx`
- Frameworks: React, Tailwind CSS, Framer Motion.
- No new dependencies required. We will heavily utilize Tailwind's `backdrop-blur`, `bg-opacity`, and `mix-blend-mode` utilities.

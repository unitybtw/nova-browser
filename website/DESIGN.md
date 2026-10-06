# A little more space

User delegated visual direction. Persuasive product-led design: warm white, ink, electric blue, Manrope; cinematic alpine panorama and actual Nova screenshots. Large quiet typography and editorial split sections, no testimonial or metrics grid. Navigation is compact, product tour is the center of the story, the footer is a large typographic brand signature.

Implementation: standalone React/TypeScript/Vite site, local assets, semantic HTML, bilingual copy, native video dialog, accessible tabs, FAQ disclosures, platform downloads. CSS tokens define color, typography, spacing, corners, and motion. Support reduced motion, keyboard focus, and narrow screens.

Verification: production build; desktop and mobile rendered review; 320/375/414/768 widths; language, tour, navigation, dialog and FAQ interaction; valid download links; no missing images or console errors.

## Motion — 2026-10-06

Focal moment: the two-line opening makes room for the actual Nova interface, with a restrained camera entrance over the landscape. Continuity: the product settles toward a flatter angle as it leaves the viewport; tour tabs use one traveling indicator and a bounded image reveal. Feedback: links, platform files, mobile navigation, FAQ and video dialog respond in short, calm transitions. Section headings enter once to establish the next chapter.

Budget: CSS and Web Animations only; no new dependencies or perpetual loops. Pointer depth is limited to fine pointers on desktop. Scroll work is coalesced with requestAnimationFrame; listeners, observers and animations clean up. Content is visible without reveal scripts. System reduced motion disables spatial movement and runtime changes cancel active reveals.

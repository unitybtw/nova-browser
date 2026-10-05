# Verification — 2026-10-05

- `npm run build`: TypeScript and production Vite build passed.
- Installation audit: 71 packages, 0 vulnerabilities reported.
- In-app Chromium browser: desktop layout at 1440px and mobile layout at 375px visually reviewed.
- Turkish layout at 320, 375, 414 and 768px: document scroll width equals client width; no horizontal page overflow.
- Language switch updates visible copy and the document language/title.
- Mobile navigation opens, navigates and closes.
- Product tabs switch content and images; screenshot aspect ratios corrected after visual review.
- Platform selector changes actual official download URLs; arrow-key navigation verified.
- FAQ expands with real answers.
- Native video dialog opens and closes with Escape. Controls and local source present.
- No missing loaded images or browser warning/error logs observed.
- Installer filenames verified against GitHub's v1.5.0 release assets. Installers were not downloaded or run.

The website is a static marketing surface. It does not implement browser functionality or collect form submissions. Full cross-browser testing and screen-reader testing were not performed.

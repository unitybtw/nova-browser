# Nova website v2

The production, responsive English/Turkish marketing website for Nova Browser. Built with React, TypeScript, Vite, locally served Manrope, and Lucide icons.

## Run

```sh
cd website
npm ci
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174. To produce a static site, run `npm run build`; deploy the `dist/` directory. `npm run preview` serves the production build locally. This project currently assumes deployment at the domain root.

## Included

- English/Turkish copy with a remembered language preference
- Responsive navigation, keyboard-operable product tabs, and platform selector
- Real Nova screenshots and a native video dialog with keyboard dismissal
- Expandable FAQ, official GitHub links, and direct release downloads
- Reduced-motion support, local fonts and assets, no analytics or third-party scripts

Release links were verified against the public GitHub API on 2026-10-05 for **v1.5.0**. Update the `RELEASE` constant, platform file names, and displayed release labels in `src/App.tsx` when publishing a newer version. The release-page fallback always links to GitHub's latest release.

Product copy lives in `src/content.ts`; visual tokens and responsive styles live in `src/styles.css`. See `ASSETS.md` for asset sources and `VERIFICATION.md` for checks performed.

The approved websitev2 design has been promoted into `website/`, the existing Vercel deployment directory. Root `dev:website` and `build:website` scripts continue to work.

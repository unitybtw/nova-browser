# Assets

All assets are served locally; the site does not request external image or font hosts.

- `public/images/nova-icon.svg`, `nova-mark.svg`: original Nova logo assets from the repository.
- `newtab.png`, `assistant.png`, `sync.png`: original repository screenshots. The assistant image is displayed as a CSS crop of the actual sidebar; no UI was invented or redrawn.
- `tour.webm`, `tour-poster.jpg`: existing Nova product walkthrough from `website/public/demo/`. The walkthrough is silent and has a descriptive text label.
- Manrope: installed through `@fontsource-variable/manrope`, served by Vite. Lucide icons: `lucide-react`.
- `alpine.webp`: generated for this website with the built-in image generation tool, then converted to WebP at quality 86 (approximately 135 KB).

## Landscape generation prompt

Use case: photorealistic-natural. Create a premium panoramic landscape asset for a sophisticated desktop browser website. Wide 16:9 composition. A dreamlike but photographic aerial landscape of pale ice-blue alpine mountain ridges with a calm turquoise lake and soft luminous clouds, morning light, powder blue and periwinkle shadows, extremely elegant quiet atmosphere. The top half is very pale almost white blue open sky and soft haze, the lower half has sweeping diagonal mountain ridges and the lake. Restrained editorial travel photography, medium format camera, realistic fine details, no grain, no people, no buildings. This is a website background behind a separate actual product screenshot. No text, no logos, no browser, no UI, no devices, no typography. Avoid oversaturated fantasy colors. Edge to edge image.

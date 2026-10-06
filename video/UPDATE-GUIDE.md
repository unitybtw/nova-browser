# Nova update guide

`NovaUpdateGuide` is an 18-second, 1920 × 1080 Remotion composition with three chapters: automatic checks, user-triggered download, and user-triggered restart/install. It is an illustrative walkthrough, labeled in the film and page; it does not show live download state.

The behavior follows `electron/main.ts`: auto-download is disabled, startup check runs after 15 seconds, and recurring checks run every four hours. The changelog embeds the existing UpdateWidget for actual desktop state; web previews display a desktop-only explanation.

Render:

```sh
node_modules/.bin/remotion render video/src/index.ts NovaUpdateGuide public/changelog/update-guide.mp4 --public-dir=video/public --codec=h264 --crf=20 --concurrency=2
```

The new film uses authored vector/HTML graphics, bundled Manrope and the existing Nova icon. EN/TR caption files accompany both films. The product film, poster and full application screenshots were reused from `website/public`; no generated product screenshots or remote media were added. `update-guide.poster.jpg` is frame 7s from the new film. Curated media is attached to v1.5.0 only, so future release notes cannot inherit unrelated media.

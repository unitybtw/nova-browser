# Nova website product film

27 seconds, 1920×1080, 30 fps. Six scenes match the production website's warm white, Manrope typography, cobalt blue and alpine landscape. Product shots use actual Nova screenshots with editorial crops and smooth camera movement. There is no fabricated browser interaction.

The original ambient instrumental was synthesized specifically for this film by `scripts/generate-website-score.py`; no third-party music or voice assets are used. Run the generator from the repository root.

## Re-render

```sh
python3 video/scripts/generate-website-score.py
npx remotion render video/src/index.ts NovaWebsiteTour video/out/nova-website-tour-master.mp4 --public-dir=video/public --codec=h264 --crf=18 --concurrency=3
ffmpeg -i video/out/nova-website-tour-master.mp4 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -af volume=7dB -c:a aac -b:a 128k -movflags +faststart website/public/images/nova-tour.mp4
npx remotion still video/src/index.ts NovaWebsiteTour video/out/nova-website-tour-poster.png --frame=70 --public-dir=video/public
ffmpeg -i video/out/nova-website-tour-poster.png -frames:v 1 -q:v 3 website/public/images/nova-tour.poster.jpg
```

English and Turkish WebVTT captions live next to the final video. The website uses the Turkish track by default when its language is Turkish. The local font and screenshot assets needed for reproducible rendering live in `video/public/website-tour/`.

Timeline: identity (0–3.4s), personal space (3.4–9.4s), local AI (9.4–14.4s), encrypted sync (14.4–19.4s), open source (19.4–23s), invitation (23–27s). Scenes overlap for 0.6-second transitions.

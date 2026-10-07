# Nova website product film

33 seconds, 1920×1080, 30 fps. The film follows the website's warm white, Manrope type and cobalt blue. Current English clean-mode/light-theme screenshots are shown fully, without perspective distortion or cropped browser controls. Workspaces and the sidebar assistant use small camera movements and soft dissolves. No fabricated interactions are shown.

English narration is synthesized locally using the installed macOS Daniel voice. `scripts/generate-website-narration.py` contains the complete script and validates that every spoken segment fits its scene. The original instrumental is synthesized by `scripts/generate-website-score.py` and mixed quietly beneath the speech. No third-party voice API, credentials or licensed music are needed.

## Re-render from the repository root

Requires the project's installed Remotion CLI, macOS `say` with Daniel, Python, ffmpeg and ffprobe.

```sh
cp public/screenshots/vertical-clean-light.jpg video/public/website-tour/workspaces-clean-light.jpg
cp public/screenshots/horizontal-assistant-clean-light.jpg video/public/website-tour/assistant-clean-light.jpg
python3 video/scripts/generate-website-narration.py
python3 video/scripts/generate-website-score.py
npx remotion render video/src/index.ts NovaWebsiteTour video/out/nova-website-tour-master.mp4 --public-dir=video/public --codec=h264 --crf=18 --concurrency=3
ffmpeg -y -i video/out/nova-website-tour-master.mp4 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart website/public/images/nova-tour.mp4
ffmpeg -y -ss 8 -i website/public/images/nova-tour.mp4 -frames:v 1 -q:v 2 website/public/images/nova-tour.poster.jpg
```

English and Turkish WebVTT files next to the final video follow the spoken script. The track matching the website's language is enabled by default. Narration remains English in both website languages.

Timeline: introduction (0–4.5s), workspaces (4.5–12.5s), local assistant (12.5–21s), open source (21–27s), invitation (27–33s). Scenes overlap by 0.6 seconds. Narration starts at 0.55s, 5s, 13s, 21.5s and 27.8s. The outro holds after the final sentence. Local AI requires a model download and compatible hardware. The obsolete sync-code pairing claim has been removed.

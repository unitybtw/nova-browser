# Nova website product film

36 seconds, 1920×1080, 30 fps. Warm white, Manrope type and cobalt blue follow the website. Current English clean-mode/light-theme screenshots are shown fully, without perspective distortion or cropped browser controls.

The film combines real product screenshots with illustrative motion graphics: a drawn Nova mark, clipped word reveals, workspace cards, device/CPU paths, a drawn code window, platform capsules and a chapter progress indicator. These vector graphics illustrate the feature concepts; they do not claim to record live browser interactions. Animation is deterministic and frame-driven in `src/components/TourMotion.tsx`.

The English female narration uses Microsoft's `en-US-JennyNeural` voice through edge-tts 7.2.8, at -4% speed. The narration generator sends only the public film script to Microsoft's Edge speech service. It requires a network connection during regeneration, but the shipped film is self-contained. No API credentials or account data are required. Speech boundary metadata sets the caption timings. Every spoken segment is checked against its available scene window before the final track is replaced.

The original instrumental is synthesized by `scripts/generate-website-score.py`. Music is mixed quietly beneath the speech. Narration is filtered below 75 Hz and normalized with headroom; final audio levels are verified after rendering.

## Re-render from the repository root

Requires the project's installed Remotion CLI, Python, ffmpeg and ffprobe. Create a dedicated Python environment; do not install the voice dependency into the application's runtime.

```sh
python3 -m venv /tmp/nova-voice-tools
/tmp/nova-voice-tools/bin/pip install -r video/scripts/requirements-voice.txt
cp public/screenshots/vertical-clean-light.jpg video/public/website-tour/workspaces-clean-light.jpg
cp public/screenshots/horizontal-assistant-clean-light.jpg video/public/website-tour/assistant-clean-light.jpg
/tmp/nova-voice-tools/bin/python video/scripts/generate-website-narration.py
python3 video/scripts/generate-website-score.py
npx remotion render video/src/index.ts NovaWebsiteTour video/out/nova-website-tour-master.mp4 --public-dir=video/public --codec=h264 --crf=18 --concurrency=3
ffmpeg -y -i video/out/nova-website-tour-master.mp4 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart website/public/images/nova-tour.mp4
ffmpeg -y -ss 9 -i website/public/images/nova-tour.mp4 -frames:v 1 -q:v 2 website/public/images/nova-tour.poster.jpg
```

English and Turkish WebVTT files next to the final video follow the generated speech boundaries. The track matching the website's language is enabled by default; spoken narration remains English in both website languages.

Timeline: introduction (0–5.5s), workspaces (5.5–14.5s), local assistant (14.5–23.5s), open source (23.5–30s), invitation (30–36s). Scenes overlap by 0.6 seconds. Narration starts at 0.55s, 6s, 15s, 24s and 30.8s. The outro holds after the final sentence. Local AI requires a model download and compatible hardware. No sync-code pairing claim is made.

Voice information: https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts
Voice client: https://github.com/rany2/edge-tts

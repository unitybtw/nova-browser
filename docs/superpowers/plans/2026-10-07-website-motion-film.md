# Website motion film and female narration

Goal: upgrade the existing Nova website film with natural English female narration and purposeful motion graphics, while retaining real clean-mode/light-theme product screenshots.

- [x] Generate Jenny Neural narration with a slower delivery and scene duration checks.
- [x] Align English and Turkish caption cues with returned speech boundaries.
- [x] Build frame-driven logo tracing, word reveals, workspace cards, local device paths, source-code illustration, platform capsules and chapter progress.
- [x] Extend the composition and original score to 36 seconds to allow pauses.
- [x] Inspect representative intro, workspace, assistant, source and ending frames.
- [x] Decode the complete exported video, verify duration/codecs and audio levels, and test browser playback with captions.
- [x] Run website tests/build, update poster, commit and push the verified result.

The existing design direction remains white, spacious and Nova blue. Animated cards and diagrams are illustrative overlays around real screenshots. No fabricated messages, unsupported device pairing or live-interaction claims are added. Generated assets stay in the repository; intermediate renders stay in ignored video/out. Runtime website dependencies do not change.

Validation: all 1,080 frames rendered; five scene samples inspected. H.264 1920x1080, AAC 48 kHz, 36.053 seconds, 3,736,165 bytes. Full decode succeeded. Integrated audio measured -17.31 LUFS with -4.71 dBTP peak. Both caption tracks contain five ordered speech-aligned cues inside the duration. Website regression tests and production build passed. Browser playback reached the end without an error; sound was unmuted and captions were showing. Seeking to the workspace scene also worked.

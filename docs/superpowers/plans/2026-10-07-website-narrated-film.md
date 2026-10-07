# Narrated website film implementation plan

Goal: refresh the website's product film with current English, clean-mode, light-theme screenshots and an English narration.

Use the existing Remotion composition. Keep screenshots flat, fully visible and legible; use slow movement and restrained dissolves. The film lasts 33 seconds: introduction, workspaces, local assistant, open source, invitation. Remove the obsolete sync-code claim. Narration uses the installed macOS Daniel voice; quiet original music sits underneath. Both caption tracks follow the narration.

- [x] Copy current screenshot assets and rebuild the composition with safe image bounds.
- [x] Generate timed narration from a committed script; keep speech within each scene.
- [x] Render and inspect representative frames; decode the entire result and inspect audio levels.
- [x] Replace the website video/poster/captions, update duration and narration description, run website checks and verify playback in the browser.
- [x] Commit and push the verified assets and reproducible sources.

Validation: 990 frames rendered; H.264 1920x1080 with AAC at 48 kHz; final duration 33.045s and size 3,373,656 bytes. Full decode succeeded. Final audio measured -17.77 LUFS integrated and -4.76 dBTP peak. Both caption tracks have seven ordered cues inside the duration. Website tests and production build passed. Browser playback reached the outro with audio unmuted, no media error and the active caption track showing.

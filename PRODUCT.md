# Nova Browser

Nova is an open-source desktop browser built with React, Electron, and Chromium, for macOS, Windows, and Linux. Its interface supports horizontal and vertical tabs, workspaces, split view, an optional new-tab task widget, local AI models, and encrypted device pairing through Nova Sync.

The application checks for releases shortly after startup and every four hours. Downloads require a user action (`autoDownload = false`); installation/restart is initiated by the user. GitHub release notes are cached locally, with bundled notes as a fallback. Desktop updater IPC is unavailable in the ordinary web preview.

Design decisions: follow the user's light/dark preference, use Nova's existing logo and slate/cobalt colors, keep concrete text and real product media, and avoid unnecessary glows or decoration. The user has delegated visual direction and requested a complete, interactive changelog redesign with images and videos.

# Nova Browser Routes & Internal Pages

## Route Structure
- `nova://newtab` -> `src/components/NewTabPage.tsx` (Default dashboard with speed dials, clock, search bar, and wallpaper)
- `nova://settings` -> `src/components/SettingsPage.tsx` (Browser settings, appearance, sync, shortcuts, AI configuration)
- `nova://history` -> `src/components/HistoryPage.tsx` (Browsing history search, clear history, date grouping)
- `nova://downloads` -> `src/components/DownloadsPage.tsx` (Download manager, status, resume/cancel/open)
- `https://* / http://*` -> `src/components/BrowserView.tsx` (Chromium Webview renderer with security sandbox)
- Reader Mode -> `src/components/ReaderMode.tsx` (Distraction-free article extraction, TTS, theme options)
- AI Assistant -> `src/components/SidePanel.tsx` (WebLLM & agent control panel, attachments, memory vault)

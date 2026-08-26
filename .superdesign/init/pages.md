# Nova Browser Page Dependency Trees

## / (New Tab Page)
Entry: `src/components/NewTabPage.tsx`
Dependencies:
- `src/components/NewTabPage.tsx`
- `src/services/aiAgent.ts`
- `src/utils/searchEngine.ts`

## /settings (Settings Page)
Entry: `src/components/SettingsPage.tsx`
Dependencies:
- `src/components/SettingsPage.tsx`
- `src/services/supabaseClient.ts`
- `src/services/syncService.ts`
- `src/services/aiAgent.ts`

## /history (History Page)
Entry: `src/components/HistoryPage.tsx`
Dependencies:
- `src/components/HistoryPage.tsx`

## /downloads (Downloads Page)
Entry: `src/components/DownloadsPage.tsx`
Dependencies:
- `src/components/DownloadsPage.tsx`

## /reader (Reader Mode)
Entry: `src/components/ReaderMode.tsx`
Dependencies:
- `src/components/ReaderMode.tsx`
- `src/services/tts.ts`

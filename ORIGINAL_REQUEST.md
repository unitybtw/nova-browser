# Original User Request

## 2026-08-28T09:48:49Z

Nova Browser (Electron + React + TypeScript) codebase'inde Electron IPC katmani, CSP/webview guvenligi, URL dogrulama, XSS vektorleri, gizlilik kalkani mantigi ve React frontend durum/render hatalarini kapsayan kapsamli bir guvenlik ve hata denetimi yapilacak; tespit edilen her sorun otomatik olarak duzeltilecek ve commit atilacaktir.

Working directory: /Users/siracsimsek/Desktop/novabrowser
Integrity mode: development

## Requirements

### R1. Electron IPC ve Sandbox Guvenligi
Electron main process IPC kanallarini (`electron/main.ts`, `electron/preload.ts`) denetle. Tum IPC handler'larinda gonderici kokeninin dogrulandigini, parametrelerin sanitize edildigini ve RCE vektorlerinin bulunmadigini dogrula. Tum webview'larda `webSecurity: true`, `contextIsolation: true`, `nodeIntegration: false` ve guvenli izin filtrelerinin aktif oldugunu guvence altina al. Eksik veya zayif kontrolleri duzelt.

### R2. URL Dogrulama ve XSS Korumasi
Adres cubugu omnibox akisini (`TopBar.tsx`, `searchEngine.ts`, `safeNavigation.ts`) denetle. URL girdilerinin tehlikeli protokollere (`javascript:`, `data:`, `vbscript:`) karsi sterilize edildigini, yonlendirme dongulerin onlendigini ve XSS yuklerinin omnibox render edilirken calistirilamadigini dogrula. Tespit edilen aciklari duzelt.

### R3. Gizlilik Kalkani ve Adblocker Mantigi
Adblocker ve privacy shield isleme zincirini (`electron/main.ts` icindeki filtre yukleme, kural degerlendirme ve network interception akislari) denetle. Kurallarin dogru degerlendirilip degerlendirilmedigini, yanlis pozitiflerden kacinildigini ve exception listelerinin guvenli sekilde saklandigini dogrula. Tespit edilen hatali mantik veya guvenlik aciklari duzelt.

### R4. React Frontend Hata ve Guvenlik Acigi Taramasi
`src/App.tsx`, `src/components/SidebarTabs.tsx`, `src/components/TopBar.tsx`, `src/components/NewTabPage.tsx`, `src/components/SidePanel.tsx` ve `src/components/BrowserView.tsx` bilesenlerini denetle. Temizlenmemis event listener'lari, uncaught exception riskleri, yanlis prop dogrulamasi veya XSS'e yol acabilerek render kaliplarini tespit edip duzelt.

### R5. Yeni Test Yazimi ve Mevcut Suite Dogrulama
Tespit edilen her guvenlik acigi veya bug icin en az bir regresyon testi yaz. Mevcut `npm test` suite'inin (23 test) hicbir testinde kirilma olmadigini dogrula. Tum duzeltmeleri anlamli semantik commit mesajlariyla commit at ve `origin/main`'e push et.

## Acceptance Criteria

### Guvenlik
- Tum IPC handler'lari gonderici dogrulamasi yapar ve parametre sanitasyonu eksik degil.
- Tum webview'larda `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` aktif.
- Hicbir `javascript:`, `data:`, `vbscript:` URL'i omnibox veya webview tarafindan yuklenemiyor.
- Kimlik bilgileri, tokenlar ve sifreleme anahtarlari log veya hata mesajlarinda gorunmuyor.

### Dogrulama
- `npm run build` sifir TypeScript ve Vite hatasi ile tamamlaniyor.
- `npm test` 23/23 test geciyor (yeni testler dahil esit veya daha fazla).
- TypeScript tur hatalari `tsc --noEmit` ile sifir.

### Teslimat
- Her duzeltme icin ayri semantik commit atilmis.
- Tum degisiklikler `origin/main`'e push edilmis.
- `SECURITY_AUDIT.md` dosyasi olusturulmus: tespit edilen sorunlar, onem seviyeleri ve uygulanan duzeltmeler.

## Important Context
- STRICT ZERO EMOJIS: Never use emojis anywhere — not in code, comments, commit messages, markdown files, or UI text.
- Navbar in `website/src/components/Navbar.tsx` must NOT have `isScrolled` state or any conditional white/glass background. If you see it, remove it.
- `npm test` currently passes 23/23 — do not break any existing tests.
- Git branch: main, remote: origin (github.com/unitybtw/nova-browser)
- All commits must use semantic commit format: `type(scope): description`

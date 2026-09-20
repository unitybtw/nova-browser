import { useState, useEffect, useCallback, useRef } from 'react';

export interface OnboardingPrefs {
  theme: 'light' | 'dark' | 'system';
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield: boolean;
  importedBookmarks?: any[];
}

export interface UseOnboardingOptions {
  /** Demo modunda onboarding hiç gösterilmez (App'teki demoParams.isDemo). */
  isDemo?: boolean;
  /** App'teki settings yazma mantığı: theme/searchEngine/privacyShield merge. */
  onUpdateSettings?: (prefs: OnboardingPrefs) => void;
  /** App'teki bookmarks yazma mantığı: import edilenleri sona ekle. */
  onImportBookmarks?: (imported: any[]) => void;
}

/**
 * Onboarding ilk-açılış akışı: App.tsx'ten birebir taşıma (pure code motion).
 *
 * - `showOnboarding` initializer aynen korunur: demo'da false; yoksa
 *   `nova_onboarding_complete` + `user_settings` localStorage kontrolü
 *   (user_settings yoksa true, varsa !isCompleted).
 * - `(window as any).openOnboarding` mount etkisi aynen korunur.
 * - `handleOnboardingComplete` davranışı aynen korunur: önce
 *   `setShowOnboarding(false)`, sonra settings merge, sonra non-empty
 *   importedBookmarks append. Settings/bookmarks yazma gövdeleri App'te
 *   callback olarak durur (sadece yeri değişti); hook guard + sırayı korur.
 */
export function useOnboarding(options: UseOnboardingOptions = {}) {
  const { isDemo = false } = options;

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (isDemo) return false;
    const isCompleted = localStorage.getItem('nova_onboarding_complete') === 'true';
    const hasUserSettings = localStorage.getItem('user_settings') !== null;
    if (!hasUserSettings) {
      return true;
    }
    return !isCompleted;
  });

  useEffect(() => {
    (window as any).openOnboarding = () => setShowOnboarding(true);
    return () => {
      delete (window as any).openOnboarding;
    };
  }, []);

  // Callback'ler her render yenilenebilir (App'te inline tanımlanır);
  // handleOnboardingComplete stabil kalsın diye ref'ten okunur
  // (orijinali useCallback [] idi).
  const onUpdateSettingsRef = useRef(options.onUpdateSettings);
  onUpdateSettingsRef.current = options.onUpdateSettings;
  const onImportBookmarksRef = useRef(options.onImportBookmarks);
  onImportBookmarksRef.current = options.onImportBookmarks;

  const handleOnboardingComplete = useCallback((prefs: OnboardingPrefs) => {
    setShowOnboarding(false);
    try {
      localStorage.setItem('nova_onboarding_complete', 'true');
    } catch (_) {}
    onUpdateSettingsRef.current?.(prefs);
    if (prefs.importedBookmarks && prefs.importedBookmarks.length > 0) {
      onImportBookmarksRef.current?.(prefs.importedBookmarks);
    }
  }, []);

  return { showOnboarding, setShowOnboarding, handleOnboardingComplete };
}

import { useState, useEffect } from 'react';
import type { Extension } from '../types/browser';

/**
 * Extension listesi: App.tsx'ten birebir taşıma (pure code motion).
 *
 * - `extensions` state + mount'ta `listExtensions` fetch aynen korunur.
 * - `onExtensionChanged` aboneliği + unmount cleanup aynen korunur.
 * - Toggle/remove mantığı App'te kaldı (sadece `setExtensions` döner);
 *   TopBar / ExtensionsSection kendi local fetch'lerini korur (dokunulmadı).
 */
export function useExtensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);

  // Load extensions on mount
  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        if (window.electronAPI?.listExtensions) {
          const loaded = await window.electronAPI.listExtensions();
          setExtensions(loaded || []);
        }
      } catch (err) {
        console.error('Failed to load extensions', err);
      }
    };
    fetchExtensions();

    let cleanup: (() => void) | undefined;
    if (window.electronAPI?.onExtensionChanged) {
      cleanup = window.electronAPI.onExtensionChanged(() => {
        fetchExtensions();
      });
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return { extensions, setExtensions };
}

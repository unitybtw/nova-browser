import { useState, useEffect, useCallback, useRef } from 'react';
import type { Extension } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { showAlert, showConfirm } from '../utils/confirmDialog';

export function useExtensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  // Monotonic request token: a slow listExtensions() response must not
  // overwrite a list fetched after it (bursts of onExtensionChanged events).
  const listRequestIdRef = useRef(0);

  // Load extensions on mount
  useEffect(() => {
    const fetchExtensions = async () => {
      const requestId = ++listRequestIdRef.current;
      try {
        if (window.electronAPI?.listExtensions) {
          const loaded = await window.electronAPI.listExtensions();
          // Same staleness guard as the topbar suggestion fetch: a superseded
          // response is dropped rather than clobbering the newer list.
          if (listRequestIdRef.current !== requestId) return;
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

  const handleToggleExtension = useCallback(async (id: string) => {
    const ext = extensions.find(e => e.id === id);
    if (!ext) return;
    const nextEnabled = ext.enabled === false;
    try {
      const api = getElectronAPI();
      if (!api?.toggleExtension) throw new Error('Extension controls are unavailable in this window.');
      const result = await api.toggleExtension(id, nextEnabled);
      if (result?.error) throw new Error(result.error);
      setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: nextEnabled } : e));
    } catch (e) {
      console.error('Failed to toggle extension:', e);
      const message = e instanceof Error ? e.message : 'The extension could not be updated.';
      void showAlert({ title: 'Extensions', message });
    }
  }, [extensions]);

  const handleRemoveExtension = useCallback(async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Remove Extension',
      message: 'Are you sure you want to remove this extension?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    });
    if (confirmed) {
      try {
        const res = await getElectronAPI()?.removeExtension?.(id);
        if (res?.error) {
          console.error('Failed to remove extension:', res.error);
          void showAlert({ title: 'Extensions', message: res.error });
          return;
        }
        setExtensions(prev => prev.filter(e => e.id !== id));
      } catch (e) {
        console.error('Failed to remove extension:', e);
        void showAlert({ title: 'Extensions', message: e instanceof Error ? e.message : 'The extension could not be removed.' });
      }
    }
  }, []);

  return {
    extensions,
    setExtensions,
    handleToggleExtension,
    handleRemoveExtension,
  };
}

import { useState, useEffect, useCallback } from 'react';
import type { Extension } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { showConfirm } from '../utils/confirmDialog';

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

  const handleToggleExtension = useCallback(async (id: string) => {
    const ext = extensions.find(e => e.id === id);
    const nextEnabled = ext?.enabled === false ? true : false;
    setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: nextEnabled } : e));
    try {
      if (getElectronAPI()?.toggleExtension) {
        await getElectronAPI()?.toggleExtension(id, nextEnabled);
      }
    } catch (e) {
      console.error('Failed to toggle extension:', e);
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
          return;
        }
        setExtensions(prev => prev.filter(e => e.id !== id));
      } catch (e) {
        console.error('Failed to remove extension:', e);
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

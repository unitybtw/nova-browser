import { useState, useEffect, useCallback, useRef } from 'react';
import type { Extension } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { showAlert, showConfirm } from '../utils/confirmDialog';

export function useExtensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [pendingExtensionIds, setPendingExtensionIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const listRequestIdRef = useRef(0);

  const refreshExtensions = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    const api = getElectronAPI();
    if (!mountedRef.current || !api?.listExtensions) return;
    try {
      const loaded = await api.listExtensions();
      if (!mountedRef.current || listRequestIdRef.current !== requestId) return;
      if (!Array.isArray(loaded)) throw new Error('Invalid extension list response.');
      setExtensions(loaded);
    } catch (err) {
      console.error('Failed to load extensions', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshExtensions();
    const cleanup = getElectronAPI()?.onExtensionChanged?.(() => { void refreshExtensions(); });

    return () => {
      mountedRef.current = false;
      listRequestIdRef.current++;
      cleanup?.();
    };
  }, [refreshExtensions]);

  const beginAction = useCallback((id: string) => {
    if (!mountedRef.current || pendingRef.current.has(id)) return false;
    pendingRef.current.add(id);
    setPendingExtensionIds(new Set(pendingRef.current));
    return true;
  }, []);
  const endAction = useCallback((id: string) => {
    pendingRef.current.delete(id);
    if (mountedRef.current) setPendingExtensionIds(new Set(pendingRef.current));
  }, []);

  const handleToggleExtension = useCallback(async (id: string) => {
    const ext = extensions.find(e => e.id === id);
    if (!ext || !beginAction(id)) return;
    const nextEnabled = ext.enabled === false;
    try {
      const api = getElectronAPI();
      if (!api?.toggleExtension) throw new Error('Extension controls are unavailable in this window.');
      const result = await api.toggleExtension(id, nextEnabled);
      if (result?.success !== true) throw new Error(result?.error || 'The extension update was not confirmed.');
      if (!mountedRef.current) return;
      setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: nextEnabled } : e));
      // Refresh also invalidates lists started before this confirmed mutation.
      void refreshExtensions();
    } catch (e) {
      console.error('Failed to toggle extension:', e);
      const message = e instanceof Error ? e.message : 'The extension could not be updated.';
      if (mountedRef.current) void showAlert({ title: 'Extensions', message });
    } finally {
      endAction(id);
    }
  }, [extensions, beginAction, endAction, refreshExtensions]);

  const handleRemoveExtension = useCallback(async (id: string) => {
    if (!beginAction(id)) return;
    try {
      const api = getElectronAPI();
      if (!api?.removeExtension) throw new Error('Extension controls are unavailable in this window.');
      const confirmed = await showConfirm({
        title: 'Remove Extension',
        message: 'Are you sure you want to remove this extension?',
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel'
      });
      if (!confirmed || !mountedRef.current) return;
      const result = await api.removeExtension(id);
      if (result?.success !== true) throw new Error(result?.error || 'The extension removal was not confirmed.');
      if (!mountedRef.current) return;
      setExtensions(prev => prev.filter(e => e.id !== id));
      void refreshExtensions();
    } catch (e) {
      console.error('Failed to remove extension:', e);
      if (mountedRef.current) {
        void refreshExtensions();
        void showAlert({ title: 'Extensions', message: e instanceof Error ? e.message : 'The extension could not be removed.' });
      }
    } finally {
      endAction(id);
    }
  }, [beginAction, endAction, refreshExtensions]);

  return {
    extensions,
    setExtensions,
    pendingExtensionIds,
    refreshExtensions,
    handleToggleExtension,
    handleRemoveExtension,
  };
}

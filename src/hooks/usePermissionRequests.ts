import { useState, useEffect, useCallback } from 'react';
import { PermissionRequest } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';

/**
 * Owns the site-permission prompt queue (Chrome-style top bar prompts): the
 * pending requests state, the onPermissionRequest IPC listener, and the
 * respond/dismiss handlers. Extracted as pure code motion from App.tsx.
 */
export function usePermissionRequests() {
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    const api = getElectronAPI();
    if (api?.onPermissionRequest) {
      const removeListener = api.onPermissionRequest((_event: any, request: PermissionRequest) => {
        setPermissionRequests(prev => {
          const filtered = prev.filter(r => r.requestId !== request.requestId);
          if (filtered.length >= 5) {
            // Drop excessive permission requests to prevent UI flooding attacks
            try {
              api.respondPermissionRequest?.(request.requestId, false, false);
            } catch (_) {}
            return filtered;
          }
          return [...filtered, request];
        });
      });
      return () => {
        try { removeListener?.(); } catch (_) {}
      };
    }
  }, []);

  const handleRespondPermission = useCallback(async (requestId: string, allow: boolean, remember: boolean) => {
    const api = getElectronAPI();
    if (api?.respondPermissionRequest) {
      try {
        await api.respondPermissionRequest(requestId, allow, remember);
      } catch (e) {
        console.error('Failed to respond to permission request:', e);
      }
    }
    setPermissionRequests(prev => prev.filter(r => r.requestId !== requestId));
  }, []);

  const handleDismissPermission = useCallback((requestId: string) => {
    const api = getElectronAPI();
    if (api?.respondPermissionRequest) {
      try {
        api.respondPermissionRequest(requestId, false, false);
      } catch (e) {}
    }
    setPermissionRequests(prev => prev.filter(r => r.requestId !== requestId));
  }, []);

  return { permissionRequests, handleRespondPermission, handleDismissPermission };
}

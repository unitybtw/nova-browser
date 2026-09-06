import { useState, useEffect, useCallback } from 'react';
import { PermissionRequest } from '../types/browser';

/**
 * Owns the site-permission prompt queue (Chrome-style top bar prompts): the
 * pending requests state, the onPermissionRequest IPC listener, and the
 * respond/dismiss handlers. Extracted as pure code motion from App.tsx.
 */
export function usePermissionRequests() {
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onPermissionRequest) {
      const removeListener = (window as any).electronAPI.onPermissionRequest((_event: any, request: PermissionRequest) => {
        setPermissionRequests(prev => {
          const filtered = prev.filter(r => r.requestId !== request.requestId);
          if (filtered.length >= 5) {
            // Drop excessive permission requests to prevent UI flooding attacks
            try {
              (window as any).electronAPI?.respondPermissionRequest?.(request.requestId, false, false);
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
    if (typeof window !== 'undefined' && (window as any).electronAPI?.respondPermissionRequest) {
      try {
        await (window as any).electronAPI.respondPermissionRequest(requestId, allow, remember);
      } catch (e) {
        console.error('Failed to respond to permission request:', e);
      }
    }
    setPermissionRequests(prev => prev.filter(r => r.requestId !== requestId));
  }, []);

  const handleDismissPermission = useCallback((requestId: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.respondPermissionRequest) {
      try {
        (window as any).electronAPI.respondPermissionRequest(requestId, false, false);
      } catch (e) {}
    }
    setPermissionRequests(prev => prev.filter(r => r.requestId !== requestId));
  }, []);

  return { permissionRequests, handleRespondPermission, handleDismissPermission };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionRequest } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';

export const MAX_CONCURRENT_PERMISSION_PROMPTS = 5;

/**
 * Pure state reducer for permission requests queue with flood attack protection.
 * Exported for rigorous production verification.
 */
export function processIncomingPermissionRequest(
  current: PermissionRequest[],
  incoming: PermissionRequest,
  onDropExcess?: (requestId: string) => void
): { updatedQueue: PermissionRequest[]; dropped: boolean } {
  const filtered = current.filter(r => r.requestId !== incoming.requestId);
  if (filtered.length >= MAX_CONCURRENT_PERMISSION_PROMPTS) {
    onDropExcess?.(incoming.requestId);
    return { updatedQueue: filtered, dropped: true };
  }
  return { updatedQueue: [...filtered, incoming], dropped: false };
}

/**
 * Owns the site-permission prompt queue (Chrome-style top bar prompts): the
 * pending requests state, the onPermissionRequest IPC listener, and the
 * respond/dismiss handlers. Extracted as pure code motion from App.tsx.
 */
export function usePermissionRequests() {
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const requestsRef = useRef<PermissionRequest[]>(permissionRequests);

  useEffect(() => {
    requestsRef.current = permissionRequests;
  }, [permissionRequests]);

  useEffect(() => {
    const api = getElectronAPI();
    if (api?.onPermissionRequest) {
      const removeListener = api.onPermissionRequest((_event: any, request: PermissionRequest) => {
        // StrictMode-safe: side effects (IPC response) must be executed outside
        // the state updater to avoid duplicate IPC calls during double-invoke passes.
        const { updatedQueue, dropped } = processIncomingPermissionRequest(
          requestsRef.current,
          request,
          (reqId) => {
            try {
              api.respondPermissionRequest?.(reqId, false, false);
            } catch (_) {}
          }
        );
        if (!dropped) {
          requestsRef.current = updatedQueue;
          setPermissionRequests(updatedQueue);
        }
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
    const next = requestsRef.current.filter(r => r.requestId !== requestId);
    requestsRef.current = next;
    setPermissionRequests(next);
  }, []);

  const handleDismissPermission = useCallback((requestId: string) => {
    const api = getElectronAPI();
    if (api?.respondPermissionRequest) {
      try {
        api.respondPermissionRequest(requestId, false, false);
      } catch (e) {}
    }
    const next = requestsRef.current.filter(r => r.requestId !== requestId);
    requestsRef.current = next;
    setPermissionRequests(next);
  }, []);

  return { permissionRequests, handleRespondPermission, handleDismissPermission };
}

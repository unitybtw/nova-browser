import { useCallback, useEffect, useRef } from 'react';

type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * Returns a wrapper around setTimeout that automatically clears any pending timers
 * when the component unmounts, preventing memory leaks and state updates on unmounted components.
 */
export function useSafeTimeout() {
  const timersRef = useRef<Set<TimeoutId>>(new Set());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
    };
  }, []);

  const setSafeTimeout = useCallback((callback: () => void, delayMs: number): TimeoutId => {
    let timerId: TimeoutId;
    timerId = setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delayMs);
    timersRef.current.add(timerId);
    return timerId;
  }, []);

  const clearSafeTimeout = useCallback((timerId: TimeoutId | null | undefined) => {
    if (timerId !== null && timerId !== undefined) {
      clearTimeout(timerId);
      timersRef.current.delete(timerId);
    }
  }, []);

  return { setSafeTimeout, clearSafeTimeout };
}

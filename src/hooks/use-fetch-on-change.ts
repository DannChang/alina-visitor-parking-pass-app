import { useEffect, useRef } from 'react';

/**
 * Calls `callback` whenever any value in `deps` changes.
 * Designed for fire-and-forget fetch calls triggered by dependency changes.
 *
 * Internal useEffect is acceptable here — this is a reusable primitive
 * that encapsulates the "fetch when deps change" pattern so consumers
 * never need raw useEffect.
 *
 * @param callback - The function to call when deps change. May be async.
 * @param deps - Dependency array (same semantics as useEffect deps).
 */
export function useFetchOnChange(
  callback: () => void | Promise<void>,
  deps: React.DependencyList,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: primitive hook
  useEffect(() => {
    callbackRef.current();
  }, deps);
}

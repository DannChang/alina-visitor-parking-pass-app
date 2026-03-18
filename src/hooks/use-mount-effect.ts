import { useEffect, type EffectCallback } from 'react';

/**
 * Runs an effect exactly once on mount (and cleanup on unmount).
 * This is the ONLY place in the codebase where direct useEffect is permitted.
 * All other mount-only effects should use this hook instead.
 */
export function useMountEffect(effect: EffectCallback): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}

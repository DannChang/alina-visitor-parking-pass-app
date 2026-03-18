import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of the given value.
 * The returned value only updates after `delay` ms of inactivity.
 *
 * Internal useEffect is acceptable here — this is a reusable primitive
 * that encapsulates the debounce-via-setTimeout pattern so consumers
 * never need raw useEffect.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: primitive hook
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

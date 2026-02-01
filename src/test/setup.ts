/**
 * Test Setup
 * Global configuration for Vitest tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock crypto.subtle for license plate hashing tests
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = await import('crypto');
  // @ts-expect-error - webcrypto types don't match perfectly
  globalThis.crypto = webcrypto;
}

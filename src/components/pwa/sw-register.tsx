'use client';

import { useMountEffect } from '@/hooks/use-mount-effect';

export function ServiceWorkerRegister() {
  useMountEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed silently
      });
    }
  });

  return null;
}

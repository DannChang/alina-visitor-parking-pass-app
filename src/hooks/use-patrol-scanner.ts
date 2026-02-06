'use client';

import { useState, useCallback } from 'react';
import { performOCR, type OCRResult } from '@/services/ocr-service';
import {
  cacheLookupResult,
  getCachedLookup,
} from '@/services/offline-cache-service';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import type { PatrolLookupResult } from '@/app/api/patrol/lookup/route';

export type ScanState = 'idle' | 'processing' | 'looking_up' | 'complete' | 'error';

export interface UseScannerReturn {
  scanState: ScanState;
  ocrResult: OCRResult | null;
  lookupResult: PatrolLookupResult | null;
  currentImage: string | null;
  error: string | null;
  isOffline: boolean;
  scan: (imageData: string) => Promise<void>;
  reset: () => void;
  manualLookup: (licensePlate: string) => Promise<void>;
}

/**
 * Custom hook for patrol scanner workflow
 * Handles OCR processing and vehicle lookup with offline support
 */
export function usePatrolScanner(): UseScannerReturn {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [lookupResult, setLookupResult] = useState<PatrolLookupResult | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const lookupPlate = useCallback(async (normalizedPlate: string): Promise<PatrolLookupResult | null> => {
    // Check if online
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);

    // Try cache first if offline
    if (!online) {
      const cached = await getCachedLookup(normalizedPlate);
      if (cached) {
        return cached;
      }
      throw new Error('Offline and no cached data available for this plate');
    }

    // Online - call API
    const response = await fetch('/api/patrol/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licensePlate: normalizedPlate }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Lookup failed: ${response.status}`);
    }

    const result: PatrolLookupResult = await response.json();

    // Cache the result for offline use
    await cacheLookupResult(normalizedPlate, result);

    return result;
  }, []);

  const scan = useCallback(async (imageData: string) => {
    setScanState('processing');
    setError(null);
    setOcrResult(null);
    setLookupResult(null);
    setCurrentImage(imageData);

    try {
      // Step 1: OCR
      const ocr = await performOCR(imageData);
      setOcrResult(ocr);

      if (!ocr.success || !ocr.normalizedPlate) {
        setScanState('error');
        setError(ocr.error || 'Could not read license plate from image');
        return;
      }

      // Step 2: Lookup
      setScanState('looking_up');
      const lookup = await lookupPlate(ocr.normalizedPlate);

      if (lookup) {
        setLookupResult(lookup);
        setScanState('complete');
      } else {
        setScanState('error');
        setError('Lookup returned no results');
      }
    } catch (err) {
      setScanState('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [lookupPlate]);

  const manualLookup = useCallback(async (licensePlate: string) => {
    setScanState('looking_up');
    setError(null);
    setOcrResult(null);
    setLookupResult(null);
    setCurrentImage(null);

    try {
      const normalizedPlate = normalizeLicensePlate(licensePlate);

      if (normalizedPlate.length < 2) {
        throw new Error('Please enter a valid license plate');
      }

      const lookup = await lookupPlate(normalizedPlate);

      if (lookup) {
        setLookupResult(lookup);
        setScanState('complete');
      } else {
        setScanState('error');
        setError('Lookup returned no results');
      }
    } catch (err) {
      setScanState('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [lookupPlate]);

  const reset = useCallback(() => {
    setScanState('idle');
    setOcrResult(null);
    setLookupResult(null);
    setCurrentImage(null);
    setError(null);
    setIsOffline(false);
  }, []);

  return {
    scanState,
    ocrResult,
    lookupResult,
    currentImage,
    error,
    isOffline,
    scan,
    reset,
    manualLookup,
  };
}

'use client';

import { useState, useCallback } from 'react';
import { performOCR, type OCRResult } from '@/services/ocr-service';
import { cacheLookupResult, getCachedLookup } from '@/services/offline-cache-service';
import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';
import type { PatrolLookupResult } from '@/app/api/patrol/lookup/route';

export type ScanState = 'idle' | 'processing' | 'looking_up' | 'adding' | 'complete' | 'error';

export interface ManualVehicleInput {
  licensePlate: string;
  make?: string | undefined;
  model?: string | undefined;
  color?: string | undefined;
  state?: string | undefined;
  year?: number | undefined;
}

export interface ManualVehicleAddResult {
  created: boolean;
  restored: boolean;
  vehicle: {
    id: string;
    licensePlate: string;
    normalizedPlate: string;
    make: string | null;
    model: string | null;
    color: string | null;
    state: string | null;
    year: number | null;
  };
}

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
  manualAddVehicle: (input: ManualVehicleInput) => Promise<ManualVehicleAddResult>;
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

  const lookupPlate = useCallback(
    async (normalizedPlate: string): Promise<PatrolLookupResult | null> => {
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
    },
    []
  );

  const scan = useCallback(
    async (imageData: string) => {
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
    },
    [lookupPlate]
  );

  const manualLookup = useCallback(
    async (licensePlate: string) => {
      setScanState('looking_up');
      setError(null);
      setOcrResult(null);
      setLookupResult(null);
      setCurrentImage(null);

      try {
        const normalizedPlate = normalizeLicensePlate(licensePlate);
        const validation = validateLicensePlate(normalizedPlate);

        if (!validation.isValid) {
          throw new Error(validation.error || 'Please enter a valid license plate');
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
    },
    [lookupPlate]
  );

  const manualAddVehicle = useCallback(
    async (input: ManualVehicleInput): Promise<ManualVehicleAddResult> => {
      try {
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setIsOffline(!online);

        if (!online) {
          throw new Error('Vehicle creation requires an online connection');
        }

        const normalizedPlate = normalizeLicensePlate(input.licensePlate);
        const validation = validateLicensePlate(normalizedPlate);

        if (!validation.isValid) {
          throw new Error(validation.error || 'Please enter a valid license plate');
        }

        setScanState('adding');
        setError(null);
        setOcrResult(null);
        setLookupResult(null);
        setCurrentImage(null);

        const response = await fetch('/api/patrol/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...input,
            licensePlate: input.licensePlate.trim().toUpperCase(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message =
            typeof errorData.error === 'string'
              ? errorData.error
              : `Vehicle creation failed: ${response.status}`;
          throw new Error(message);
        }

        const createdVehicle: ManualVehicleAddResult = await response.json();
        const lookup = await lookupPlate(createdVehicle.vehicle.normalizedPlate);

        if (!lookup) {
          throw new Error('Vehicle was created, but the patrol lookup refresh failed');
        }

        setLookupResult(lookup);
        setScanState('complete');

        return createdVehicle;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to add vehicle from patrol mode';
        setScanState('error');
        setError(message);
        throw error;
      }
    },
    [lookupPlate]
  );

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
    manualAddVehicle,
  };
}

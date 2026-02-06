/**
 * OCR Service for License Plate Recognition
 * Client-side processing using Tesseract.js (runs entirely in browser)
 */

import Tesseract from 'tesseract.js';
import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';

export interface OCRResult {
  success: boolean;
  licensePlate: string | null;
  normalizedPlate: string | null;
  confidence: number;
  rawText: string;
  error?: string;
  processingTime: number;
  source: 'server' | 'client';
}

export interface OCROptions {
  preferServer?: boolean;
  timeout?: number;
}

/**
 * Pre-process OCR text to extract license plate
 * License plates typically follow patterns like ABC123 or ABC-1234
 */
function extractLicensePlateFromText(text: string): string | null {
  // Clean up the text
  const cleaned = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .trim();

  // Common license plate patterns (US formats)
  const patterns = [
    /\b([A-Z]{2,3}[\s-]?[0-9]{3,4})\b/, // ABC 1234, ABC-123
    /\b([0-9]{3,4}[\s-]?[A-Z]{2,3})\b/, // 1234 ABC, 123-ABC
    /\b([A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3})\b/, // A123BC, ABC1234
    /\b([0-9]{1,4}[A-Z]{1,3}[0-9]{0,4})\b/, // 123ABC, 1ABC234
    /\b([A-Z0-9]{5,8})\b/, // Generic 5-8 character plate
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/[\s-]/g, '');
      if (candidate.length >= 4 && candidate.length <= 8) {
        return candidate;
      }
    }
  }

  // Fallback: try to find any sequence of 4-8 alphanumeric characters
  const alphanumMatch = cleaned.replace(/\s+/g, '').match(/[A-Z0-9]{4,8}/);
  if (alphanumMatch) {
    return alphanumMatch[0];
  }

  return null;
}

/**
 * Apply license plate specific corrections to OCR output
 */
function applyPlateCorrections(text: string): string {
  let result = text;

  // Split into letter and number sections
  const parts = result.match(/([A-Z]+)|([0-9]+)/g);
  if (!parts) return result;

  result = parts
    .map((part) => {
      // If the part is likely numbers (in a number position), apply corrections
      if (/^\d+$/.test(part)) {
        // Already numbers, keep as-is
        return part;
      }

      // Check if this part should be numbers based on position/context
      // For now, keep letters as letters
      return part;
    })
    .join('');

  return result;
}

/**
 * Client-side OCR using Tesseract.js
 * Used as fallback when server is unavailable (offline mode)
 */
export async function performClientOCR(imageData: string): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Create a worker for license plate recognition
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {}, // Suppress logging in production
    });

    // Configure for license plate recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    });

    const result = await worker.recognize(imageData);
    await worker.terminate();

    const rawText = result.data.text.trim();
    const confidence = result.data.confidence;

    // Extract and validate license plate
    const extractedPlate = extractLicensePlateFromText(rawText);

    if (!extractedPlate) {
      return {
        success: false,
        licensePlate: null,
        normalizedPlate: null,
        confidence: 0,
        rawText,
        error: 'No license plate pattern detected in image',
        processingTime: Date.now() - startTime,
        source: 'client',
      };
    }

    const correctedPlate = applyPlateCorrections(extractedPlate);
    const normalizedPlate = normalizeLicensePlate(correctedPlate);
    const validation = validateLicensePlate(normalizedPlate);

    if (!validation.isValid) {
      return {
        success: false,
        licensePlate: correctedPlate,
        normalizedPlate,
        confidence: confidence / 100,
        rawText,
        error: validation.error || 'Invalid license plate format',
        processingTime: Date.now() - startTime,
        source: 'client',
      };
    }

    return {
      success: true,
      licensePlate: correctedPlate,
      normalizedPlate,
      confidence: confidence / 100,
      rawText,
      processingTime: Date.now() - startTime,
      source: 'client',
    };
  } catch (error) {
    return {
      success: false,
      licensePlate: null,
      normalizedPlate: null,
      confidence: 0,
      rawText: '',
      error: error instanceof Error ? error.message : 'OCR processing failed',
      processingTime: Date.now() - startTime,
      source: 'client',
    };
  }
}

/**
 * Server-side OCR via API
 * Primary method for better accuracy and speed
 */
export async function performServerOCR(
  imageData: string,
  timeout: number = 30000
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('/api/ocr/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();

    return {
      ...result,
      processingTime: Date.now() - startTime,
      source: 'server' as const,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        licensePlate: null,
        normalizedPlate: null,
        confidence: 0,
        rawText: '',
        error: 'Request timed out',
        processingTime: Date.now() - startTime,
        source: 'server',
      };
    }

    throw error; // Re-throw for fallback handling
  }
}

/**
 * Perform OCR on an image
 * Uses client-side Tesseract.js by default for reliability
 * Server-side available as opt-in for future use
 */
export async function performOCR(
  imageData: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { preferServer = false, timeout = 30000 } = options;

  // Use server-side only if explicitly requested and online
  if (preferServer) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      try {
        return await performServerOCR(imageData, timeout);
      } catch {
        // Server failed, fall back to client-side processing
        return performClientOCR(imageData);
      }
    }
  }

  // Default: use client-side OCR (runs in browser)
  return performClientOCR(imageData);
}

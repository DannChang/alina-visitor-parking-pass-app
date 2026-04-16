/**
 * OCR Service for License Plate Recognition
 * Client-side processing using Tesseract.js (runs entirely in browser)
 */

import Tesseract from 'tesseract.js';
import { validateLicensePlate } from '@/lib/utils/license-plate';
import { extractBestLicensePlate, type OCRTextObservation } from '@/lib/utils/ocr-license-plate';

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

interface OCRImageVariant {
  label: string;
  image: string | HTMLCanvasElement;
}

interface RecognitionAttempt {
  label: string;
  image: string | HTMLCanvasElement;
  pageSegmentationMode: Tesseract.PSM;
}

const OCR_CHARACTER_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function loadImage(imageData: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load captured image'));
    image.src = imageData;
  });
}

function createVariantCanvas(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  options: {
    targetWidth: number;
    grayscale?: boolean;
    contrast?: number;
    brightness?: number;
    threshold?: number;
  }
): HTMLCanvasElement {
  const aspectRatio = crop.width / crop.height;
  const targetWidth = Math.max(600, Math.round(options.targetWidth));
  const targetHeight = Math.max(240, Math.round(targetWidth / aspectRatio));
  const canvas = createCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    return canvas;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const contrast = options.contrast ?? 1;
  const brightness = options.brightness ?? 1;
  const threshold = options.threshold;

  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index] ?? 0;
    let green = pixels[index + 1] ?? 0;
    let blue = pixels[index + 2] ?? 0;

    if (options.grayscale) {
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      red = luminance;
      green = luminance;
      blue = luminance;
    }

    red = clampChannel((red - 128) * contrast + 128);
    green = clampChannel((green - 128) * contrast + 128);
    blue = clampChannel((blue - 128) * contrast + 128);

    red = clampChannel(red * brightness);
    green = clampChannel(green * brightness);
    blue = clampChannel(blue * brightness);

    if (threshold !== undefined) {
      const binaryValue = (red + green + blue) / 3 >= threshold ? 255 : 0;
      red = binaryValue;
      green = binaryValue;
      blue = binaryValue;
    }

    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
  }

  context.putImageData(imageData, 0, 0);

  return canvas;
}

async function prepareOCRImageVariants(imageData: string): Promise<OCRImageVariant[]> {
  if (typeof document === 'undefined') {
    return [{ label: 'original', image: imageData }];
  }

  const image = await loadImage(imageData);
  const focusWidth = image.width * 0.6;
  const focusHeight = focusWidth * 0.45;
  const focusCrop = {
    x: (image.width - focusWidth) / 2,
    y: (image.height - focusHeight) / 2,
    width: focusWidth,
    height: focusHeight,
  };
  const fullCrop = {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  return [
    {
      label: 'focused-color',
      image: createVariantCanvas(image, focusCrop, { targetWidth: 1400 }),
    },
    {
      label: 'focused-contrast',
      image: createVariantCanvas(image, focusCrop, {
        targetWidth: 1400,
        grayscale: true,
        contrast: 1.8,
        brightness: 1.08,
      }),
    },
    {
      label: 'focused-binary',
      image: createVariantCanvas(image, focusCrop, {
        targetWidth: 1400,
        grayscale: true,
        contrast: 2.4,
        brightness: 1.15,
        threshold: 145,
      }),
    },
    {
      label: 'full-frame-contrast',
      image: createVariantCanvas(image, fullCrop, {
        targetWidth: 1280,
        grayscale: true,
        contrast: 1.4,
        brightness: 1.04,
      }),
    },
  ];
}

async function prepareServerOCRImage(imageData: string): Promise<string> {
  if (typeof document === 'undefined') {
    return imageData;
  }

  try {
    const variants = await prepareOCRImageVariants(imageData);
    const preferredVariant = variants.find((variant) => variant.label === 'focused-color')?.image;

    if (!preferredVariant) {
      return imageData;
    }

    if (typeof preferredVariant === 'string') {
      return preferredVariant;
    }

    return preferredVariant.toDataURL('image/jpeg', 0.92);
  } catch {
    return imageData;
  }
}

async function runRecognitionAttempts(
  worker: Tesseract.Worker,
  attempts: RecognitionAttempt[]
): Promise<OCRTextObservation[]> {
  const observations: OCRTextObservation[] = [];

  for (const attempt of attempts) {
    await worker.setParameters({
      tessedit_char_whitelist: OCR_CHARACTER_WHITELIST,
      tessedit_pageseg_mode: attempt.pageSegmentationMode,
    });

    const recognition = await worker.recognize(attempt.image);
    const rawText = recognition.data.text.trim();
    const confidence = recognition.data.confidence / 100;

    observations.push({
      text: rawText,
      confidence,
      source: attempt.label,
    });

    const candidate = extractBestLicensePlate(observations);
    if (candidate && candidate.score >= 9) {
      break;
    }
  }

  return observations;
}

/**
 * Client-side OCR using Tesseract.js
 * Used as fallback when server is unavailable (offline mode)
 */
export async function performClientOCR(imageData: string): Promise<OCRResult> {
  const startTime = Date.now();
  let worker: Tesseract.Worker | null = null;

  try {
    const variants = await prepareOCRImageVariants(imageData);
    const attempts: RecognitionAttempt[] = [
      {
        label: 'focused-contrast:block',
        image: variants[1]?.image ?? imageData,
        pageSegmentationMode: Tesseract.PSM.SINGLE_BLOCK,
      },
      {
        label: 'focused-binary:line',
        image: variants[2]?.image ?? imageData,
        pageSegmentationMode: Tesseract.PSM.SINGLE_LINE,
      },
      {
        label: 'focused-color:word',
        image: variants[0]?.image ?? imageData,
        pageSegmentationMode: Tesseract.PSM.SINGLE_WORD,
      },
      {
        label: 'full-frame:sparse',
        image: variants[3]?.image ?? imageData,
        pageSegmentationMode: Tesseract.PSM.SPARSE_TEXT,
      },
    ];

    worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {}, // Suppress logging in production
    });

    const observations = await runRecognitionAttempts(worker, attempts);
    const rawText = observations
      .map((observation) => observation.text)
      .filter(Boolean)
      .join('\n---\n');
    const candidate = extractBestLicensePlate(observations);

    if (!candidate) {
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

    const validation = validateLicensePlate(candidate.normalizedPlate);

    if (!validation.isValid) {
      return {
        success: false,
        licensePlate: candidate.licensePlate,
        normalizedPlate: candidate.normalizedPlate,
        confidence: Math.max(0, ...observations.map((observation) => observation.confidence ?? 0)),
        rawText,
        error: validation.error || 'Invalid license plate format',
        processingTime: Date.now() - startTime,
        source: 'client',
      };
    }

    return {
      success: true,
      licensePlate: candidate.licensePlate,
      normalizedPlate: candidate.normalizedPlate,
      confidence: Math.max(0, ...observations.map((observation) => observation.confidence ?? 0)),
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
  } finally {
    if (worker) {
      await worker.terminate();
    }
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
    const preparedImageData = await prepareServerOCRImage(imageData);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('/api/ocr/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: preparedImageData }),
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
export async function performOCR(imageData: string, options: OCROptions = {}): Promise<OCRResult> {
  const { preferServer = true, timeout = 30000 } = options;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (preferServer && isOnline) {
    try {
      const serverResult = await performServerOCR(imageData, timeout);
      if (serverResult.success) {
        return serverResult;
      }
    } catch {
      // Fall through to client-side OCR.
    }
  }

  const clientResult = await performClientOCR(imageData);

  if (clientResult.success || !isOnline) {
    return clientResult;
  }

  try {
    const serverResult = await performServerOCR(imageData, timeout);
    return serverResult.success ? serverResult : clientResult;
  } catch {
    return clientResult;
  }
}

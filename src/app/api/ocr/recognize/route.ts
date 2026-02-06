import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';

// License plate patterns for extraction
const PLATE_PATTERNS = [
  /\b([A-Z]{2,3}[\s-]?[0-9]{3,4})\b/,
  /\b([0-9]{3,4}[\s-]?[A-Z]{2,3})\b/,
  /\b([A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3})\b/,
  /\b([0-9]{1,4}[A-Z]{1,3}[0-9]{0,4})\b/,
  /\b([A-Z0-9]{5,8})\b/,
];

function extractLicensePlateFromText(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').trim();

  for (const pattern of PLATE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].replace(/[\s-]/g, '');
      if (candidate.length >= 4 && candidate.length <= 8) {
        return candidate;
      }
    }
  }

  const alphanumMatch = cleaned.replace(/\s+/g, '').match(/[A-Z0-9]{4,8}/);
  return alphanumMatch ? alphanumMatch[0] : null;
}

// POST /api/ocr/recognize - Process image and extract license plate
export async function POST(request: NextRequest) {
  // Require passes:view_all or violations:create permission (patrol mode users)
  const authResult = await requirePermission(['passes:view_all', 'violations:create']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Validate that it's a valid data URL
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected data URL.' },
        { status: 400 }
      );
    }

    // Create Tesseract worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {}, // Suppress logging
    });

    // Configure for license plate recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    });

    const result = await worker.recognize(image);
    await worker.terminate();

    const rawText = result.data.text.trim();
    const confidence = result.data.confidence / 100;

    // Extract license plate from text
    const extractedPlate = extractLicensePlateFromText(rawText);

    if (!extractedPlate) {
      return NextResponse.json({
        success: false,
        licensePlate: null,
        normalizedPlate: null,
        confidence: 0,
        rawText,
        error: 'No license plate pattern detected in image',
      });
    }

    const normalizedPlate = normalizeLicensePlate(extractedPlate);
    const validation = validateLicensePlate(normalizedPlate);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        licensePlate: extractedPlate,
        normalizedPlate,
        confidence,
        rawText,
        error: validation.error || 'Invalid license plate format',
      });
    }

    return NextResponse.json({
      success: true,
      licensePlate: extractedPlate,
      normalizedPlate,
      confidence,
      rawText,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

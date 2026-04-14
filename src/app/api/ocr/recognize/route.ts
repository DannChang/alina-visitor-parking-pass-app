import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { requirePermission } from '@/lib/api-auth';
import { validateLicensePlate } from '@/lib/utils/license-plate';
import { extractBestLicensePlate, type OCRTextObservation } from '@/lib/utils/ocr-license-plate';

const OCR_CHARACTER_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// POST /api/ocr/recognize - Process image and extract license plate
export async function POST(request: NextRequest) {
  // Require passes:view_all or violations:create permission (patrol mode users)
  const authResult = await requirePermission(['passes:view_all', 'violations:create']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  let worker: Tesseract.Worker | null = null;

  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Validate that it's a valid data URL
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected data URL.' },
        { status: 400 }
      );
    }

    worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {}, // Suppress logging
    });

    const attempts: Array<{ psm: Tesseract.PSM; label: string }> = [
      { psm: Tesseract.PSM.SINGLE_BLOCK, label: 'server:block' },
      { psm: Tesseract.PSM.SINGLE_LINE, label: 'server:line' },
      { psm: Tesseract.PSM.SPARSE_TEXT, label: 'server:sparse' },
    ];
    const observations: OCRTextObservation[] = [];

    for (const attempt of attempts) {
      await worker.setParameters({
        tessedit_char_whitelist: OCR_CHARACTER_WHITELIST,
        tessedit_pageseg_mode: attempt.psm,
      });

      const recognition = await worker.recognize(image);
      observations.push({
        text: recognition.data.text.trim(),
        confidence: recognition.data.confidence / 100,
        source: attempt.label,
      });

      const candidate = extractBestLicensePlate(observations);
      if (candidate && candidate.score >= 9) {
        break;
      }
    }

    const rawText = observations
      .map((observation) => observation.text)
      .filter(Boolean)
      .join('\n---\n');
    const candidate = extractBestLicensePlate(observations);

    if (!candidate) {
      return NextResponse.json({
        success: false,
        licensePlate: null,
        normalizedPlate: null,
        confidence: 0,
        rawText,
        error: 'No license plate pattern detected in image',
      });
    }

    const validation = validateLicensePlate(candidate.normalizedPlate);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        licensePlate: candidate.licensePlate,
        normalizedPlate: candidate.normalizedPlate,
        confidence: Math.max(0, ...observations.map((observation) => observation.confidence ?? 0)),
        rawText,
        error: validation.error || 'Invalid license plate format',
      });
    }

    return NextResponse.json({
      success: true,
      licensePlate: candidate.licensePlate,
      normalizedPlate: candidate.normalizedPlate,
      confidence: Math.max(0, ...observations.map((observation) => observation.confidence ?? 0)),
      rawText,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';

interface PlateRecognizerCandidate {
  plate: string;
  score?: number;
}

interface PlateRecognizerBox {
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
}

interface PlateRecognizerRegion {
  code?: string;
  score?: number;
}

interface PlateRecognizerResult {
  plate: string;
  score?: number;
  dscore?: number;
  region?: PlateRecognizerRegion;
  candidates?: PlateRecognizerCandidate[];
  box?: PlateRecognizerBox;
}

interface PlateRecognizerResponse {
  results?: PlateRecognizerResult[];
}

export interface OnlineALPRResult {
  success: boolean;
  licensePlate: string | null;
  normalizedPlate: string | null;
  confidence: number;
  rawText: string;
  error?: string;
  provider: 'plate-recognizer';
  regionCode?: string | null | undefined;
}

const DEFAULT_PLATE_RECOGNIZER_API_URL = 'https://api.platerecognizer.com/v1/plate-reader/';
const DEFAULT_REGION_HINTS = ['ca-bc', 'ca', 'us', 'mx'];

function getPlateRecognizerApiToken(): string | null {
  return process.env.PLATE_RECOGNIZER_API_TOKEN?.trim() || null;
}

export function isOnlineALPREnabled(): boolean {
  return Boolean(getPlateRecognizerApiToken());
}

export function getPlateRecognizerRegionHints(): string[] {
  const configuredRegions = process.env.PLATE_RECOGNIZER_REGION_HINTS?.split(',')
    .map((region) => region.trim())
    .filter(Boolean);

  if (!configuredRegions || configuredRegions.length === 0) {
    return DEFAULT_REGION_HINTS;
  }

  return configuredRegions;
}

function getPlateRecognizerConfig(): string | null {
  const shouldUseStrictRegion = process.env.PLATE_RECOGNIZER_STRICT_REGION === 'true';

  if (!shouldUseStrictRegion) {
    return null;
  }

  return JSON.stringify({ region: 'strict' });
}

function dataUrlToBlob(imageData: string): Blob {
  const [metadata, base64Payload] = imageData.split(',', 2);

  if (!metadata || !base64Payload) {
    throw new Error('Invalid OCR image payload');
  }

  const mimeTypeMatch = metadata.match(/^data:(.+);base64$/);
  const mimeType = mimeTypeMatch?.[1] || 'image/jpeg';
  const buffer = Buffer.from(base64Payload, 'base64');

  return new Blob([buffer], { type: mimeType });
}

function getBoxArea(box?: PlateRecognizerBox): number {
  if (!box) {
    return 0;
  }

  const width = Math.max(0, (box.xmax ?? 0) - (box.xmin ?? 0));
  const height = Math.max(0, (box.ymax ?? 0) - (box.ymin ?? 0));

  return width * height;
}

function getResultScore(result: PlateRecognizerResult): number {
  const recognitionScore = result.score ?? 0;
  const detectionScore = result.dscore ?? 0;
  const areaBonus = Math.min(0.2, getBoxArea(result.box) / 500000);

  return recognitionScore + detectionScore * 0.35 + areaBonus;
}

function formatRawPlateRecognizerOutput(result: PlateRecognizerResult): string {
  const candidateSummary = (result.candidates ?? [])
    .slice(0, 5)
    .map((candidate) => `${candidate.plate}:${Math.round((candidate.score ?? 0) * 100)}%`)
    .join(', ');

  return [
    `provider=plate-recognizer`,
    `plate=${result.plate}`,
    result.region?.code ? `region=${result.region.code}` : null,
    candidateSummary ? `candidates=${candidateSummary}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function pickBestPlateRecognizerResult(
  results: PlateRecognizerResult[]
): PlateRecognizerResult | null {
  return (
    [...results]
      .filter((result) => Boolean(result.plate))
      .sort((left, right) => getResultScore(right) - getResultScore(left))[0] ?? null
  );
}

export async function recognizeLicensePlateOnline(imageData: string): Promise<OnlineALPRResult> {
  const apiToken = getPlateRecognizerApiToken();

  if (!apiToken) {
    return {
      success: false,
      licensePlate: null,
      normalizedPlate: null,
      confidence: 0,
      rawText: '',
      error: 'Cloud ALPR is not configured',
      provider: 'plate-recognizer',
    };
  }

  const formData = new FormData();
  formData.append('upload', dataUrlToBlob(imageData), 'plate-scan.jpg');

  for (const region of getPlateRecognizerRegionHints()) {
    formData.append('regions', region);
  }

  const providerConfig = getPlateRecognizerConfig();
  if (providerConfig) {
    formData.append('config', providerConfig);
  }

  const apiUrl = process.env.PLATE_RECOGNIZER_API_URL?.trim() || DEFAULT_PLATE_RECOGNIZER_API_URL;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
    },
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as PlateRecognizerResponse & {
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Cloud ALPR request failed');
  }

  const bestResult = pickBestPlateRecognizerResult(data.results ?? []);

  if (!bestResult) {
    return {
      success: false,
      licensePlate: null,
      normalizedPlate: null,
      confidence: 0,
      rawText: '',
      error: 'No license plate detected by cloud ALPR',
      provider: 'plate-recognizer',
    };
  }

  const normalizedPlate = normalizeLicensePlate(bestResult.plate);
  const validation = validateLicensePlate(normalizedPlate);

  if (!validation.isValid) {
    return {
      success: false,
      licensePlate: bestResult.plate.toUpperCase(),
      normalizedPlate,
      confidence: Math.max(bestResult.score ?? 0, bestResult.dscore ?? 0),
      rawText: formatRawPlateRecognizerOutput(bestResult),
      error: validation.error || 'Invalid license plate format',
      provider: 'plate-recognizer',
      regionCode: bestResult.region?.code,
    };
  }

  return {
    success: true,
    licensePlate: normalizedPlate,
    normalizedPlate,
    confidence: Math.max(bestResult.score ?? 0, bestResult.dscore ?? 0),
    rawText: formatRawPlateRecognizerOutput(bestResult),
    provider: 'plate-recognizer',
    regionCode: bestResult.region?.code,
  };
}

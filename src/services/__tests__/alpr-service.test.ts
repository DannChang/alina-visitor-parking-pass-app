import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlateRecognizerRegionHints, recognizeLicensePlateOnline } from '../alpr-service';

const originalEnv = {
  apiToken: process.env.PLATE_RECOGNIZER_API_TOKEN,
  apiUrl: process.env.PLATE_RECOGNIZER_API_URL,
  regionHints: process.env.PLATE_RECOGNIZER_REGION_HINTS,
  strictRegion: process.env.PLATE_RECOGNIZER_STRICT_REGION,
};

describe('ALPR service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PLATE_RECOGNIZER_API_TOKEN = 'test-token';
    delete process.env.PLATE_RECOGNIZER_API_URL;
    delete process.env.PLATE_RECOGNIZER_REGION_HINTS;
    delete process.env.PLATE_RECOGNIZER_STRICT_REGION;
  });

  afterEach(() => {
    process.env.PLATE_RECOGNIZER_API_TOKEN = originalEnv.apiToken;
    process.env.PLATE_RECOGNIZER_API_URL = originalEnv.apiUrl;
    process.env.PLATE_RECOGNIZER_REGION_HINTS = originalEnv.regionHints;
    process.env.PLATE_RECOGNIZER_STRICT_REGION = originalEnv.strictRegion;
  });

  it('defaults to BC-first North America region hints', () => {
    expect(getPlateRecognizerRegionHints()).toEqual(['ca-bc', 'ca', 'us', 'mx']);
  });

  it('returns the highest-scoring cloud ALPR plate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              plate: 'bc49kn',
              score: 0.71,
              dscore: 0.88,
              region: { code: 'ca-bc' },
              box: { xmin: 1, xmax: 50, ymin: 1, ymax: 20 },
            },
            {
              plate: '649knl',
              score: 0.93,
              dscore: 0.96,
              region: { code: 'ca-bc' },
              candidates: [
                { plate: '649knl', score: 0.93 },
                { plate: '649kni', score: 0.62 },
              ],
              box: { xmin: 1, xmax: 300, ymin: 1, ymax: 120 },
            },
          ],
        }),
      })
    );

    const result = await recognizeLicensePlateOnline('data:image/jpeg;base64,aGVsbG8=');

    expect(result).toMatchObject({
      success: true,
      licensePlate: '649KNL',
      normalizedPlate: '649KNL',
      provider: 'plate-recognizer',
      regionCode: 'ca-bc',
    });
    expect(result.rawText).toContain('plate=649knl');
  });

  it('returns a no-detection error when the provider finds no plates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      })
    );

    const result = await recognizeLicensePlateOnline('data:image/jpeg;base64,aGVsbG8=');

    expect(result).toMatchObject({
      success: false,
      licensePlate: null,
      normalizedPlate: null,
      error: 'No license plate detected by cloud ALPR',
    });
  });
});

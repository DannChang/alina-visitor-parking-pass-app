import { describe, expect, it } from 'vitest';
import { extractBestLicensePlate, extractLicensePlateFromText } from '../ocr-license-plate';

describe('OCR license plate extraction', () => {
  it('extracts a stacked North American plate across multiple lines', () => {
    expect(extractLicensePlateFromText('ABC\n1234')).toBe('ABC1234');
  });

  it('prefers the plate over province text in OCR output', () => {
    const candidate = extractBestLicensePlate([
      { text: 'ONTARIO', confidence: 0.98, source: 'banner' },
      { text: 'ABC 1234', confidence: 0.72, source: 'plate' },
    ]);

    expect(candidate?.licensePlate).toBe('ABC1234');
  });

  it('rejects pure jurisdiction noise that looks like OCR text', () => {
    expect(extractLicensePlateFromText('0NTAR10')).toBeNull();
  });

  it('still allows all-letter vanity plates when they are not jurisdiction words', () => {
    expect(extractLicensePlateFromText('SUNSET')).toBe('SUNSET');
  });
});

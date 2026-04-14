import { normalizeLicensePlate, validateLicensePlate } from './license-plate';

export interface OCRTextObservation {
  text: string;
  confidence?: number;
  source?: string | undefined;
}

export interface ExtractedLicensePlate {
  licensePlate: string;
  normalizedPlate: string;
  rawText: string;
  score: number;
  source?: string | undefined;
}

const COMMON_PLATE_PATTERNS = [
  /^[A-Z]{1,4}[0-9]{1,4}[A-Z]{0,2}$/,
  /^[0-9]{1,4}[A-Z]{1,4}[0-9]{0,2}$/,
  /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$/,
  /^[0-9]{1,2}[A-Z]{1,4}[0-9]{1,4}$/,
];

const LETTER_LIKE_DIGITS: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
};

const AMBIGUOUS_CHAR_MAP: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  G: '6',
  T: '7',
  B: '8',
  A: '4',
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
};

const STATE_AND_PROVINCE_NOISE = new Set([
  'ALABAMA',
  'ALASKA',
  'ALBERTA',
  'ARIZONA',
  'ARKANSAS',
  'BRITISHCOLUMBIA',
  'CALIFORNIA',
  'COLORADO',
  'CONNECTICUT',
  'DELAWARE',
  'FLORIDA',
  'GEORGIA',
  'HAWAII',
  'IDAHO',
  'ILLINOIS',
  'INDIANA',
  'IOWA',
  'KANSAS',
  'KENTUCKY',
  'LOUISIANA',
  'MAINE',
  'MANITOBA',
  'MARYLAND',
  'MASSACHUSETTS',
  'MEXICO',
  'MICHIGAN',
  'MINNESOTA',
  'MISSISSIPPI',
  'MISSOURI',
  'MONTANA',
  'NEBRASKA',
  'NEVADA',
  'NEWBRUNSWICK',
  'NEWFOUNDLAND',
  'NEWHAMPSHIRE',
  'NEWJERSEY',
  'NEWMEXICO',
  'NEWYORK',
  'NORTHCAROLINA',
  'NORTHDAKOTA',
  'NORTHWESTTERRITORIES',
  'NOVASCOTIA',
  'NUNAVUT',
  'OHIO',
  'OKLAHOMA',
  'ONTARIO',
  'OREGON',
  'PENNSYLVANIA',
  'PRINCEEDWARDISLAND',
  'QUEBEC',
  'SASKATCHEWAN',
  'SOUTHCAROLINA',
  'SOUTHDAKOTA',
  'TENNESSEE',
  'TEXAS',
  'UTAH',
  'VERMONT',
  'VIRGINIA',
  'WASHINGTON',
  'WESTVIRGINIA',
  'WISCONSIN',
  'WYOMING',
  'YUKON',
]);

const GENERIC_NOISE = new Set([
  'AMERICA',
  'APPORTIONED',
  'AUTOMOBILE',
  'COMMERCIAL',
  'DEALER',
  'DRIVER',
  'EXEMPT',
  'GOVERNMENT',
  'LICENSE',
  'PASSENGER',
  'PLATE',
  'REGISTERED',
  'REGISTRATION',
  'STATE',
  'TRAILER',
  'TRUCK',
  'VEHICLE',
  'VISITOR',
]);

function projectDigitsToLetters(value: string): string {
  return value
    .split('')
    .map((character) => LETTER_LIKE_DIGITS[character] ?? character)
    .join('');
}

function looksLikeNoiseWord(value: string): boolean {
  const normalized = normalizeLicensePlate(value);
  if (!normalized) {
    return true;
  }

  const projected = projectDigitsToLetters(normalized);

  if (STATE_AND_PROVINCE_NOISE.has(projected) || GENERIC_NOISE.has(projected)) {
    return true;
  }

  if (projected.length >= 6) {
    for (const word of STATE_AND_PROVINCE_NOISE) {
      if (projected.includes(word)) {
        return true;
      }
    }
  }

  return false;
}

function addSeed(seeds: Map<string, number>, value: string, bonus: number): void {
  const normalized = normalizeLicensePlate(value);
  if (normalized.length < 2 || normalized.length > 12) {
    return;
  }

  const existingBonus = seeds.get(normalized);
  if (existingBonus === undefined || bonus > existingBonus) {
    seeds.set(normalized, bonus);
  }
}

function collectCandidateSeeds(text: string): Array<{ value: string; bonus: number }> {
  const seeds = new Map<string, number>();
  const lines = text
    .toUpperCase()
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/[^A-Z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  const normalizedText = text
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalizedText) {
    addSeed(seeds, normalizedText, 0.1);
  }

  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      addSeed(seeds, token, 0);
    }

    if (tokens.length > 1) {
      addSeed(seeds, tokens.join(''), 0.6);

      for (let index = 0; index < tokens.length - 1; index += 1) {
        addSeed(seeds, `${tokens[index]}${tokens[index + 1]}`, 0.4);
      }
    }

    addSeed(seeds, line.replace(/[\s-]/g, ''), 0.8);
  }

  for (let index = 0; index < lines.length - 1; index += 1) {
    const currentLine = lines[index];
    const nextLine = lines[index + 1];
    if (!currentLine || !nextLine) {
      continue;
    }

    const combined = `${currentLine.replace(/[\s-]/g, '')}${nextLine.replace(/[\s-]/g, '')}`;
    addSeed(seeds, combined, 1);
  }

  return [...seeds.entries()].map(([value, bonus]) => ({ value, bonus }));
}

function generateVariants(seed: string): string[] {
  const normalized = normalizeLicensePlate(seed);
  if (!normalized) {
    return [];
  }

  const hasLetters = /[A-Z]/.test(normalized);
  const hasDigits = /[0-9]/.test(normalized);

  if (!hasLetters || !hasDigits) {
    return [normalized];
  }

  const ambiguousPositions = normalized
    .split('')
    .flatMap((character, index) =>
      AMBIGUOUS_CHAR_MAP[character] ? [{ index, replacement: AMBIGUOUS_CHAR_MAP[character] }] : []
    )
    .slice(0, 4);

  const variants = new Set<string>([normalized]);
  const variantCount = 1 << ambiguousPositions.length;

  for (let mask = 1; mask < variantCount; mask += 1) {
    const characters = normalized.split('');

    ambiguousPositions.forEach(({ index, replacement }, bitIndex) => {
      if ((mask & (1 << bitIndex)) !== 0) {
        characters[index] = replacement;
      }
    });

    variants.add(characters.join(''));
  }

  return [...variants].filter((variant) => variant.length >= 2 && variant.length <= 8);
}

function scoreCandidate(
  candidate: string,
  confidence: number,
  structuralBonus: number,
  originalSeed: string
): number {
  if (looksLikeNoiseWord(candidate)) {
    return Number.NEGATIVE_INFINITY;
  }

  const letters = candidate.replace(/[^A-Z]/g, '').length;
  const digits = candidate.replace(/[^0-9]/g, '').length;
  const hasMixedCharacters = letters > 0 && digits > 0;
  const isRepeatedCharacter = /(.)\1{3,}/.test(candidate);
  const matchesCommonPattern = COMMON_PLATE_PATTERNS.some((pattern) => pattern.test(candidate));
  const originalSeedHasLetters = /[A-Z]/.test(originalSeed);
  const originalSeedHasDigits = /[0-9]/.test(originalSeed);
  const changedCharacters = candidate
    .split('')
    .filter((character, index) => character !== originalSeed[index]).length;

  let score = structuralBonus;

  if (candidate.length >= 5 && candidate.length <= 7) {
    score += 3;
  } else if (candidate.length === 4 || candidate.length === 8) {
    score += 2;
  } else {
    score += 1;
  }

  score += hasMixedCharacters ? 3.5 : 1.5;
  score += matchesCommonPattern ? 2 : 0;
  score += confidence * 2;
  score += candidate === originalSeed ? 1.5 : 0;
  score -= changedCharacters * 0.75;

  if (!originalSeedHasDigits && digits > 0) {
    score -= 3;
  }

  if (!originalSeedHasLetters && letters > 0) {
    score -= 2.5;
  }

  if (isRepeatedCharacter) {
    score -= 2;
  }

  return score;
}

export function extractBestLicensePlate(
  observations: OCRTextObservation[]
): ExtractedLicensePlate | null {
  const candidates = new Map<
    string,
    ExtractedLicensePlate & { hits: number; bestSingleScore: number }
  >();

  for (const observation of observations) {
    const rawText = observation.text.trim();
    if (!rawText) {
      continue;
    }

    const confidence = Math.max(0, Math.min(1, observation.confidence ?? 0.5));
    const seeds = collectCandidateSeeds(rawText);

    for (const seed of seeds) {
      if (looksLikeNoiseWord(seed.value)) {
        continue;
      }

      const normalizedSeed = normalizeLicensePlate(seed.value);
      const variants = generateVariants(seed.value);

      for (const variant of variants) {
        const validation = validateLicensePlate(variant);
        if (!validation.isValid) {
          continue;
        }

        const score = scoreCandidate(variant, confidence, seed.bonus, normalizedSeed);
        if (!Number.isFinite(score) || score < 4) {
          continue;
        }

        const existing = candidates.get(variant);

        if (existing) {
          existing.hits += 1;
          existing.score += score + 0.5;

          if (score > existing.bestSingleScore) {
            existing.bestSingleScore = score;
            existing.rawText = rawText;
            existing.source = observation.source;
          }
        } else {
          candidates.set(variant, {
            licensePlate: variant,
            normalizedPlate: variant,
            rawText,
            score,
            source: observation.source,
            hits: 1,
            bestSingleScore: score,
          });
        }
      }
    }
  }

  return (
    [...candidates.values()].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.hits !== left.hits) {
        return right.hits - left.hits;
      }

      return right.licensePlate.length - left.licensePlate.length;
    })[0] ?? null
  );
}

export function extractLicensePlateFromText(text: string): string | null {
  return extractBestLicensePlate([{ text }])?.licensePlate ?? null;
}

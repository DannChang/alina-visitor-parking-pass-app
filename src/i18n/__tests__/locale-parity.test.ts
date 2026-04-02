import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';
import vi from '../../messages/vi.json';
import zhHans from '../../messages/zh-Hans.json';
import zhHant from '../../messages/zh-Hant.json';
import fa from '../../messages/fa.json';
import ko from '../../messages/ko.json';

type MessageObject = Record<string, unknown>;

function getKeyPaths(obj: MessageObject, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeyPaths(value as MessageObject, path);
    }
    return [path];
  });
}

const enKeys = new Set(getKeyPaths(en as MessageObject));

const localeFiles: Record<string, MessageObject> = {
  es: es as MessageObject,
  fr: fr as MessageObject,
  vi: vi as MessageObject,
  'zh-Hans': zhHans as MessageObject,
  'zh-Hant': zhHant as MessageObject,
  fa: fa as MessageObject,
  ko: ko as MessageObject,
};

for (const [localeName, messages] of Object.entries(localeFiles)) {
  describe(`${localeName} locale parity`, () => {
    const localeKeys = new Set(getKeyPaths(messages));

    it('has all keys from en.json', () => {
      const missingKeys = [...enKeys].filter((k) => !localeKeys.has(k));
      expect(missingKeys, `Missing keys in ${localeName}: ${missingKeys.join(', ')}`).toEqual([]);
    });

    it('has no extra keys not in en.json', () => {
      const extraKeys = [...localeKeys].filter((k) => !enKeys.has(k));
      expect(extraKeys, `Extra keys in ${localeName}: ${extraKeys.join(', ')}`).toEqual([]);
    });
  });
}

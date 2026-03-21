import { describe, it, expect } from 'vitest';
import { negotiateLocale } from '../request';

describe('negotiateLocale', () => {
  it('should return default for null header', () => {
    expect(negotiateLocale(null)).toBe('en');
  });

  it('should match simple locale codes', () => {
    expect(negotiateLocale('es')).toBe('es');
    expect(negotiateLocale('fr,en;q=0.9')).toBe('fr');
    expect(negotiateLocale('ko-KR,ko;q=0.9,en;q=0.8')).toBe('ko');
  });

  it('should match zh-Hans and zh-Hant from Accept-Language', () => {
    expect(negotiateLocale('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh-Hans');
    expect(negotiateLocale('zh-TW,zh;q=0.9,en;q=0.8')).toBe('zh-Hant');
    expect(negotiateLocale('zh,en;q=0.9')).toBe('zh-Hans');
  });

  it('should match Farsi', () => {
    expect(negotiateLocale('fa-IR,fa;q=0.9,en;q=0.8')).toBe('fa');
  });

  it('should match Vietnamese', () => {
    expect(negotiateLocale('vi-VN,vi;q=0.9')).toBe('vi');
  });

  it('should return default for unsupported locale', () => {
    expect(negotiateLocale('de-DE,de;q=0.9')).toBe('en');
  });
});

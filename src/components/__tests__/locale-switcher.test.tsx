// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleSwitcher } from '../locale-switcher';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}));

// Mock the locale persistence helper
vi.mock('@/i18n/client', () => ({
  persistLocaleAndReload: vi.fn(),
}));

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render globe icon and current locale code', () => {
    render(<LocaleSwitcher />);
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('should open dropdown with all language options on click', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('简体中文')).toBeInTheDocument();
    expect(screen.getByText('繁體中文')).toBeInTheDocument();
    expect(screen.getByText('فارسی')).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
    expect(screen.getByText('Tiếng Việt')).toBeInTheDocument();
  });

  it('should omit excluded language options', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher excludedLocales={['fa']} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.queryByText('فارسی')).not.toBeInTheDocument();
  });

  it('should persist the selected locale when selecting a language', async () => {
    const { persistLocaleAndReload } = await import('@/i18n/client');

    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Español'));

    expect(persistLocaleAndReload).toHaveBeenCalledWith('es');
  });

  it('should use the current selection for consecutive clicks', async () => {
    const { persistLocaleAndReload } = await import('@/i18n/client');
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Tiếng Việt'));
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('한국어'));

    expect(persistLocaleAndReload).toHaveBeenNthCalledWith(1, 'vi');
    expect(persistLocaleAndReload).toHaveBeenNthCalledWith(2, 'ko');
  });
});

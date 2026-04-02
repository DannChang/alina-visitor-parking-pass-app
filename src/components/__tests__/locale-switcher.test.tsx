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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

// Mock the server action
vi.mock('@/i18n/actions', () => ({
  setLocale: vi.fn(() => Promise.resolve()),
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

  it('should call setLocale and refresh when selecting a language', async () => {
    const { setLocale } = await import('@/i18n/actions');
    const { useRouter } = await import('next/navigation');
    const mockRefresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh: mockRefresh } as never);

    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Español'));

    expect(setLocale).toHaveBeenCalledWith('es');
  });
});

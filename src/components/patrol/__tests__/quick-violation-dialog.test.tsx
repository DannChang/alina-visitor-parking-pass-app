// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QuickViolationDialog } from '../quick-violation-dialog';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('QuickViolationDialog', () => {
  it('renders open without requiring a FormField context for evidence photos', () => {
    render(
      <QuickViolationDialog
        open
        onOpenChange={vi.fn()}
        licensePlate="TEST123"
        scanImage={null}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Issue Violation')).toBeInTheDocument();
    expect(screen.getByText('Evidence Photos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log violation/i })).toBeInTheDocument();
  });
});

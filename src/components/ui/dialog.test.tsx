// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function mockMobileViewport(height: number) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderOpenDialog(onOpenChange = vi.fn()) {
  return render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Sheet</DialogTitle>
          <DialogDescription>Sheet description</DialogDescription>
        </DialogHeader>
        <div>Measured content</div>
      </DialogContent>
    </Dialog>
  );
}

describe('DialogContent mobile bottom sheet', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    mockMobileViewport(800);

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 900,
    });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sizes to a content-aware expanded snap point on mobile', async () => {
    renderOpenDialog();

    const dialog = screen.getByRole('dialog');
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
    expect(dialog.scrollHeight).toBe(900);

    await waitFor(() => {
      expect(dialog).toHaveStyle({ '--dialog-sheet-height': '720px' });
    });
  });

  it('drags the handle between measured snap points', async () => {
    renderOpenDialog();

    const dialog = screen.getByRole('dialog');
    const handle = screen.getByRole('button', { name: /drag bottom sheet/i });

    await waitFor(() => {
      expect(dialog).toHaveStyle({ '--dialog-sheet-height': '720px' });
    });

    fireEvent.pointerDown(handle, { button: 0, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 620, pointerId: 1 });

    expect(dialog).toHaveStyle({ '--dialog-sheet-height': '500px' });

    fireEvent.pointerUp(handle, { clientY: 620, pointerId: 1 });

    await waitFor(() => {
      expect(dialog).toHaveStyle({ '--dialog-sheet-height': '448px' });
    });

    fireEvent.pointerDown(handle, { button: 0, clientY: 620, pointerId: 2 });
    fireEvent.pointerMove(handle, { clientY: 280, pointerId: 2 });
    fireEvent.pointerUp(handle, { clientY: 280, pointerId: 2 });

    await waitFor(() => {
      expect(dialog).toHaveStyle({ '--dialog-sheet-height': '720px' });
    });
  });

  it('requests close when the handle is pulled past the lowest snap point', async () => {
    const onOpenChange = vi.fn();
    renderOpenDialog(onOpenChange);

    const handle = screen.getByRole('button', { name: /drag bottom sheet/i });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveStyle({ '--dialog-sheet-height': '720px' });
    });

    fireEvent.pointerDown(handle, { button: 0, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 900, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 900, pointerId: 1 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

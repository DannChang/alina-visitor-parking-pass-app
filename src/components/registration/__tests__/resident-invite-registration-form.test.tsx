// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResidentInviteRegistrationForm } from '../resident-invite-registration-form';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockSignIn = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

const invite = {
  id: 'invite-1',
  status: 'PENDING' as const,
  recipientName: 'Jane Resident',
  recipientEmail: 'jane@example.com',
  recipientPhone: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  revokeReason: null,
  building: {
    id: 'building-1',
    name: 'Alina',
    slug: 'alina',
  },
  unit: {
    id: 'unit-1',
    unitNumber: '101',
  },
};

describe('ResidentInviteRegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    mockSignIn.mockResolvedValue({});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          buildingSlug: 'alina',
          unitNumber: '101',
        }),
      })
    );
  });

  async function enablePrivacyConsent(user: ReturnType<typeof userEvent.setup>) {
    const policyContainer = screen.getByTestId('resident-registration-privacy-policy');
    Object.defineProperty(policyContainer, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(policyContainer, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(policyContainer, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 800,
    });
    fireEvent.scroll(policyContainer);
    await user.click(screen.getByLabelText(/i have read and agree to the privacy policy/i));
  }

  it('disables license plate entry when no vehicle is selected', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    const licensePlateInput = screen.getByPlaceholderText('License plate #1');
    expect(licensePlateInput).toBeEnabled();

    await user.click(screen.getByLabelText(/i don't have a vehicle/i));

    expect(licensePlateInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /add plate/i })).toBeDisabled();
  });

  it('submits an empty personal plate list when no vehicle is selected', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    await user.type(screen.getByLabelText(/strata lot/i), '123');
    await user.type(screen.getByPlaceholderText('Stall #1'), '12');
    await user.click(screen.getByLabelText(/i don't have a vehicle/i));
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
    await enablePrivacyConsent(user);
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/resident-invites/consume',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'token-1',
            password: 'Resident@123!',
            hasVehicle: false,
            strataLotNumber: '123',
            assignedStallNumbers: ['12'],
            personalLicensePlates: [],
            privacyConsent: true,
            privacyPolicyVersion: '2026-04-02',
          }),
        })
      );
    });
  });

  it('requires at least one plate when the resident has a vehicle', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    await user.type(screen.getByLabelText(/strata lot/i), '123');
    await user.type(screen.getByPlaceholderText('Stall #1'), '12');
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
    await user.clear(screen.getByPlaceholderText('License plate #1'));
    expect(screen.getByRole('button', { name: /activate account/i })).toBeDisabled();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects successful resident registration to the resident passes page', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    await user.type(screen.getByLabelText(/strata lot/i), '123');
    await user.clear(screen.getByPlaceholderText('Stall #1'));
    await user.type(screen.getByPlaceholderText('Stall #1'), '12');
    await user.clear(screen.getByPlaceholderText('License plate #1'));
    await user.type(screen.getByPlaceholderText('License plate #1'), 'abc123');
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
    await enablePrivacyConsent(user);
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/resident/passes');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('keeps activate account disabled until the form and privacy consent are complete', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    const activateButton = screen.getByRole('button', { name: /activate account/i });
    expect(activateButton).toBeDisabled();

    await user.type(screen.getByLabelText(/strata lot/i), '123');
    await user.type(screen.getByPlaceholderText('Stall #1'), '12');
    await user.type(screen.getByPlaceholderText('License plate #1'), 'ABC123');
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');

    expect(activateButton).toBeDisabled();

    await enablePrivacyConsent(user);

    expect(activateButton).toBeEnabled();
  });

  it('sends the back to resident login action to the public auth chooser', () => {
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    expect(screen.getByRole('link', { name: /back to resident login/i })).toHaveAttribute(
      'href',
      '/?showAuthChooser=1'
    );
  });
});

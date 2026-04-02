// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

    await user.type(
      screen.getByLabelText(/strata lot/i),
      'SL-101'
    );
    await user.type(screen.getByPlaceholderText('Assigned stall #1'), '12');
    await user.click(screen.getByLabelText(/i don't have a vehicle/i));
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
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
            strataLotNumber: 'SL-101',
            assignedStallNumbers: ['12'],
            personalLicensePlates: [],
          }),
        })
      );
    });
  });

  it('requires at least one plate when the resident has a vehicle', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    await user.type(screen.getByLabelText(/strata lot/i), 'SL-101');
    await user.type(screen.getByPlaceholderText('Assigned stall #1'), '12');
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
    await user.clear(screen.getByPlaceholderText('License plate #1'));
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    expect(
      await screen.findByText('At least one personal license plate is required.')
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects successful resident registration to the resident passes page', async () => {
    const user = userEvent.setup();
    render(<ResidentInviteRegistrationForm token="token-1" invite={invite} />);

    await user.type(screen.getByLabelText(/strata lot/i), 'SL-101');
    await user.clear(screen.getByPlaceholderText('Assigned stall #1'));
    await user.type(screen.getByPlaceholderText('Assigned stall #1'), '12');
    await user.clear(screen.getByPlaceholderText('License plate #1'));
    await user.type(screen.getByPlaceholderText('License plate #1'), 'abc123');
    await user.type(screen.getByLabelText(/^password$/i), 'Resident@123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Resident@123!');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/resident/passes');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});

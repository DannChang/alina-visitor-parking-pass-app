import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPostRequest } from '@/test/mocks/next-request';

vi.mock('@/services/password-reset-service', () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  PasswordResetError: class PasswordResetError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: string
    ) {
      super(message);
    }
  },
}));

import { POST as requestPOST } from '../request/route';
import { POST as confirmPOST } from '../confirm/route';
import {
  PasswordResetError,
  requestPasswordReset,
  resetPassword,
} from '@/services/password-reset-service';

const mockRequestPasswordReset = requestPasswordReset as ReturnType<typeof vi.fn>;
const mockResetPassword = resetPassword as ReturnType<typeof vi.fn>;

describe('Password reset API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestPasswordReset.mockResolvedValue(undefined);
    mockResetPassword.mockResolvedValue({ loginPath: '/login' });
  });

  it('accepts generic staff reset requests', async () => {
    const response = await requestPOST(
      createMockPostRequest('http://localhost:3000/api/password-reset/request', {
        accountType: 'staff',
        email: 'admin@example.com',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRequestPasswordReset).toHaveBeenCalledWith({
      accountType: 'staff',
      email: 'admin@example.com',
    });
  });

  it('defaults resident reset requests to the configured building', async () => {
    const response = await requestPOST(
      createMockPostRequest('http://localhost:3000/api/password-reset/request', {
        accountType: 'resident',
        email: 'resident@example.com',
        unitNumber: '1003',
      })
    );

    expect(response.status).toBe(200);
    expect(mockRequestPasswordReset).toHaveBeenCalledWith({
      accountType: 'resident',
      email: 'resident@example.com',
      buildingSlug: 'alina-visitor-parking',
      unitNumber: '1003',
    });
  });

  it('still requires a unit number for resident reset requests', async () => {
    const response = await requestPOST(
      createMockPostRequest('http://localhost:3000/api/password-reset/request', {
        accountType: 'resident',
        email: 'resident@example.com',
      })
    );

    expect(response.status).toBe(400);
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('confirms a password reset', async () => {
    const response = await confirmPOST(
      createMockPostRequest('http://localhost:3000/api/password-reset/confirm', {
        token: 'token-1',
        password: 'NewPassword123!',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.loginPath).toBe('/login');
    expect(mockResetPassword).toHaveBeenCalledWith({
      token: 'token-1',
      password: 'NewPassword123!',
    });
  });

  it('surfaces reset token failures', async () => {
    mockResetPassword.mockRejectedValue(
      new PasswordResetError('This password reset link has expired.', 400, 'RESET_TOKEN_EXPIRED')
    );

    const response = await confirmPOST(
      createMockPostRequest('http://localhost:3000/api/password-reset/confirm', {
        token: 'token-1',
        password: 'NewPassword123!',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('RESET_TOKEN_EXPIRED');
  });
});

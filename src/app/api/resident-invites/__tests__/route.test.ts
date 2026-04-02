import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { createMockGetRequest, createMockPostRequest } from '@/test/mocks/next-request';

vi.mock('@/lib/api-auth', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/services/resident-invite-service', () => ({
  listResidentInvites: vi.fn(),
  createResidentInvite: vi.fn(),
  revokeResidentInvite: vi.fn(),
  reissueResidentInvite: vi.fn(),
  consumeResidentInvite: vi.fn(),
  ResidentInviteError: class ResidentInviteError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: string
    ) {
      super(message);
    }
  },
}));

import { requirePermission } from '@/lib/api-auth';
import { GET, POST } from '../route';
import { POST as revokePOST } from '../[id]/revoke/route';
import { POST as reissuePOST } from '../[id]/reissue/route';
import { POST as consumePOST } from '../consume/route';
import {
  consumeResidentInvite,
  createResidentInvite,
  listResidentInvites,
  reissueResidentInvite,
  revokeResidentInvite,
} from '@/services/resident-invite-service';

const mockRequirePermission = requirePermission as ReturnType<typeof vi.fn>;
const mockListResidentInvites = listResidentInvites as ReturnType<typeof vi.fn>;
const mockCreateResidentInvite = createResidentInvite as ReturnType<typeof vi.fn>;
const mockRevokeResidentInvite = revokeResidentInvite as ReturnType<typeof vi.fn>;
const mockReissueResidentInvite = reissueResidentInvite as ReturnType<typeof vi.fn>;
const mockConsumeResidentInvite = consumeResidentInvite as ReturnType<typeof vi.fn>;

const authorizedResult = {
  authorized: true as const,
  request: {
    userId: 'manager-1',
    role: 'MANAGER',
    auth: {} as never,
  },
};

describe('Resident invite API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(authorizedResult);
  });

  it('lists invites with filters and scope', async () => {
    mockListResidentInvites.mockResolvedValue({
      invites: [],
      buildings: [],
      units: [],
    });

    const request = createMockGetRequest('http://localhost:3000/api/resident-invites', {
      search: 'alina',
      buildingId: 'building-1',
      status: 'PENDING',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockListResidentInvites).toHaveBeenCalledWith({
      userId: 'manager-1',
      role: 'MANAGER',
      search: 'alina',
      buildingId: 'building-1',
      status: 'PENDING',
    });
  });

  it('creates a registration pass', async () => {
    mockCreateResidentInvite.mockResolvedValue({
      invite: { id: 'invite-1' },
      registrationUrl: 'http://localhost:3000/register/resident/token-1',
      emailSent: true,
    });

    const request = createMockPostRequest('http://localhost:3000/api/resident-invites', {
      buildingId: 'building-1',
      unitId: 'unit-1',
      recipientName: 'Jane Resident',
      recipientEmail: 'jane@example.com',
      recipientPhone: '555-123-4567',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.registrationUrl).toContain('/register/resident/');
    expect(mockCreateResidentInvite).toHaveBeenCalledWith({
      issuerId: 'manager-1',
      issuerRole: 'MANAGER',
      buildingId: 'building-1',
      unitId: 'unit-1',
      recipientName: 'Jane Resident',
      recipientEmail: 'jane@example.com',
      recipientPhone: '555-123-4567',
    });
  });

  it('rejects invalid create payloads', async () => {
    const request = createMockPostRequest('http://localhost:3000/api/resident-invites', {
      buildingId: 'building-1',
      unitId: 'unit-1',
      recipientName: '',
      recipientEmail: 'not-an-email',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('revokes a pending registration pass', async () => {
    mockRevokeResidentInvite.mockResolvedValue({
      id: 'invite-1',
      status: 'REVOKED',
    });

    const request = createMockPostRequest(
      'http://localhost:3000/api/resident-invites/invite-1/revoke',
      { reason: 'Requested by management' }
    );

    const response = await revokePOST(request, {
      params: Promise.resolve({ id: 'invite-1' }),
    });

    expect(response.status).toBe(200);
    expect(mockRevokeResidentInvite).toHaveBeenCalledWith({
      issuerId: 'manager-1',
      issuerRole: 'MANAGER',
      inviteId: 'invite-1',
      reason: 'Requested by management',
    });
  });

  it('reissues a registration pass', async () => {
    mockReissueResidentInvite.mockResolvedValue({
      invite: { id: 'invite-2' },
      registrationUrl: 'http://localhost:3000/register/resident/token-2',
      emailSent: false,
    });

    const response = await reissuePOST(new Request('http://localhost:3000/api/resident-invites/invite-1/reissue', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'invite-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emailSent).toBe(false);
    expect(mockReissueResidentInvite).toHaveBeenCalledWith({
      issuerId: 'manager-1',
      issuerRole: 'MANAGER',
      inviteId: 'invite-1',
    });
  });

  it('consumes a resident invite', async () => {
    mockConsumeResidentInvite.mockResolvedValue({
      buildingSlug: 'alina-visitor-parking',
      unitNumber: '101',
    });

    const request = createMockPostRequest(
      'http://localhost:3000/api/resident-invites/consume',
      {
        token: 'token-1',
        password: 'Resident@123!',
        hasVehicle: true,
        strataLotNumber: 'SL-101',
        assignedStallNumbers: ['12'],
        personalLicensePlates: ['ABC123'],
      },
      {
        'user-agent': 'vitest',
      }
    );

    const response = await consumePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.buildingSlug).toBe('alina-visitor-parking');
    expect(mockConsumeResidentInvite).toHaveBeenCalledWith({
      token: 'token-1',
      password: 'Resident@123!',
      hasVehicle: true,
      strataLotNumber: 'SL-101',
      assignedStallNumbers: ['12'],
      personalLicensePlates: ['ABC123'],
      ipAddress: null,
      userAgent: 'vitest',
    });
  });

  it('consumes a resident invite without a vehicle', async () => {
    mockConsumeResidentInvite.mockResolvedValue({
      buildingSlug: 'alina-visitor-parking',
      unitNumber: '101',
    });

    const request = createMockPostRequest(
      'http://localhost:3000/api/resident-invites/consume',
      {
        token: 'token-2',
        password: 'Resident@123!',
        hasVehicle: false,
        strataLotNumber: 'SL-101',
        assignedStallNumbers: ['12'],
        personalLicensePlates: [],
      }
    );

    const response = await consumePOST(request);

    expect(response.status).toBe(200);
    expect(mockConsumeResidentInvite).toHaveBeenCalledWith({
      token: 'token-2',
      password: 'Resident@123!',
      hasVehicle: false,
      strataLotNumber: 'SL-101',
      assignedStallNumbers: ['12'],
      personalLicensePlates: [],
      ipAddress: null,
      userAgent: null,
    });
  });

  it('rejects a no-vehicle payload that still includes license plates', async () => {
    const request = createMockPostRequest(
      'http://localhost:3000/api/resident-invites/consume',
      {
        token: 'token-3',
        password: 'Resident@123!',
        hasVehicle: false,
        strataLotNumber: 'SL-101',
        assignedStallNumbers: ['12'],
        personalLicensePlates: ['ABC123'],
      }
    );

    const response = await consumePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Personal license plates must be empty when no vehicle is selected');
  });

  it('returns auth failures from the permission helper', async () => {
    mockRequirePermission.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await GET(
      createMockGetRequest('http://localhost:3000/api/resident-invites')
    );

    expect(response.status).toBe(403);
  });
});

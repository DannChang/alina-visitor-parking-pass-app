import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as entryPOST } from '../[id]/entry/route';
import { POST as exitPOST } from '../[id]/exit/route';
import { POST as reactivatePOST } from '../[id]/reactivate/route';
import { prisma } from '@/lib/prisma';
import { PassStatus } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    parkingPass: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('In-Out Privileges API', () => {
  const mockPass = {
    id: 'pass-123',
    confirmationCode: 'CONF-123',
    isInOutEnabled: true,
    endTime: new Date(Date.now() + 3600000), // 1 hour from now
    status: PassStatus.ACTIVE,
    lastEntryTime: null,
    lastExitTime: null,
    reactivatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/passes/[id]/entry', () => {
    it('should reject request without confirmation code', async () => {
      const request = new Request('http://localhost/api/passes/pass-123/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await entryPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Confirmation code required');
    });

    it('should reject request with invalid confirmation code', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce(mockPass as never);

      const request = new Request('http://localhost/api/passes/pass-123/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'WRONG-CODE' }),
      });

      const response = await entryPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Invalid confirmation code');
    });

    it('should record entry with valid confirmation code', async () => {
      const now = new Date();
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce(mockPass as never);
      vi.mocked(prisma.parkingPass.update).mockResolvedValueOnce({
        ...mockPass,
        lastEntryTime: now,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await entryPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(200);
      expect(prisma.parkingPass.update).toHaveBeenCalledWith({
        where: { id: 'pass-123' },
        data: { lastEntryTime: expect.any(Date) },
      });
    });

    it('should reject if in-out not enabled', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce({
        ...mockPass,
        isInOutEnabled: false,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await entryPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('In-out privileges are not enabled');
    });

    it('should reject if pass expired', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce({
        ...mockPass,
        endTime: new Date(Date.now() - 3600000), // 1 hour ago
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await entryPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('expired');
    });
  });

  describe('POST /api/passes/[id]/exit', () => {
    it('should reject request without confirmation code', async () => {
      const request = new Request('http://localhost/api/passes/pass-123/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await exitPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Confirmation code required');
    });

    it('should reject request with invalid confirmation code', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce(mockPass as never);

      const request = new Request('http://localhost/api/passes/pass-123/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'WRONG-CODE' }),
      });

      const response = await exitPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Invalid confirmation code');
    });

    it('should record exit with valid confirmation code', async () => {
      const now = new Date();
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce(mockPass as never);
      vi.mocked(prisma.parkingPass.update).mockResolvedValueOnce({
        ...mockPass,
        lastExitTime: now,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await exitPOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(200);
      expect(prisma.parkingPass.update).toHaveBeenCalledWith({
        where: { id: 'pass-123' },
        data: { lastExitTime: expect.any(Date) },
      });
    });
  });

  describe('POST /api/passes/[id]/reactivate', () => {
    it('should reject request without confirmation code', async () => {
      const request = new Request('http://localhost/api/passes/pass-123/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await reactivatePOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Confirmation code required');
    });

    it('should reject request with invalid confirmation code', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce({
        ...mockPass,
        status: PassStatus.INACTIVE,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'WRONG-CODE' }),
      });

      const response = await reactivatePOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Invalid confirmation code');
    });

    it('should reactivate pass with valid confirmation code', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce({
        ...mockPass,
        status: PassStatus.INACTIVE,
      } as never);
      vi.mocked(prisma.parkingPass.update).mockResolvedValueOnce({
        ...mockPass,
        status: PassStatus.ACTIVE,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await reactivatePOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(200);
      expect(prisma.parkingPass.update).toHaveBeenCalledWith({
        where: { id: 'pass-123' },
        data: {
          status: 'ACTIVE',
          reactivatedAt: expect.any(Date),
          lastEntryTime: expect.any(Date),
        },
      });
    });

    it('should reject if pass already active', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce(mockPass as never);

      const request = new Request('http://localhost/api/passes/pass-123/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await reactivatePOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('already active');
    });

    it('should reject if pass cancelled', async () => {
      vi.mocked(prisma.parkingPass.findUnique).mockResolvedValueOnce({
        ...mockPass,
        status: PassStatus.CANCELLED,
      } as never);

      const request = new Request('http://localhost/api/passes/pass-123/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: 'CONF-123' }),
      });

      const response = await reactivatePOST(request, {
        params: Promise.resolve({ id: 'pass-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot reactivate');
    });
  });
});

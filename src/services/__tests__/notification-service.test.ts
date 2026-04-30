import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockEmailSend,
    },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notificationQueue: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { sendPassConfirmation } from '../notification-service';

const mockPrisma = prisma as unknown as {
  notificationQueue: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailSend.mockResolvedValue({ error: null });
    mockPrisma.notificationQueue.create.mockResolvedValue({ id: 'notification-1' });
    mockPrisma.notificationQueue.update.mockResolvedValue({});
  });

  it('formats pass confirmation times in the building timezone', async () => {
    await sendPassConfirmation({
      recipientEmail: 'guest@example.com',
      licensePlate: '392MCR',
      unitNumber: '1301',
      buildingName: 'Alina by Strand',
      startTime: new Date('2026-04-29T05:50:00.000Z'),
      endTime: new Date('2026-04-29T09:50:00.000Z'),
      durationHours: 4,
      confirmationCode: 'CMOJMYNX',
      passId: 'pass-1',
      timezone: 'America/Vancouver',
    });

    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Tue, Apr 28, 10:50 PM'),
        subject: 'Parking Pass Confirmed - 392MCR',
      })
    );
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Wed, Apr 29, 2:50 AM'),
      })
    );
  });
});

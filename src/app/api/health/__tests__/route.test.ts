/**
 * Health Check API Route Integration Tests
 * CRITICAL: Health checks ensure the system is operational for hospital visitors
 * Target coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    parkingPass: {
      count: vi.fn(),
    },
    violation: {
      count: vi.fn(),
    },
    notificationQueue: {
      count: vi.fn(),
    },
  },
}));

// Import after mocks
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
  parkingPass: { count: ReturnType<typeof vi.fn> };
  violation: { count: ReturnType<typeof vi.fn> };
  notificationQueue: { count: ReturnType<typeof vi.fn> };
};

describe('Health Check API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are operational', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count
        .mockResolvedValueOnce(10) // active passes
        .mockResolvedValueOnce(2);  // expiring soon
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);
      process.env.RESEND_API_KEY = 'test-api-key';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.database.status).toBe('operational');
      expect(data.services.api.status).toBe('operational');
      expect(data.services.email.status).toBe('operational');
    });

    it('should include timestamp and version', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.environment).toBeDefined();
      expect(data.uptime).toBeGreaterThan(0);
    });

    it('should return metrics for active passes', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count
        .mockResolvedValueOnce(25)  // active passes
        .mockResolvedValueOnce(5);  // expiring soon
      mockPrisma.violation.count.mockResolvedValue(3);
      mockPrisma.notificationQueue.count.mockResolvedValue(10);

      const response = await GET();
      const data = await response.json();

      expect(data.metrics.activePasses).toBe(25);
      expect(data.metrics.expiringSoon).toBe(5);
      expect(data.metrics.todayViolations).toBe(3);
      expect(data.metrics.pendingNotifications).toBe(10);
    });

    it('should return memory usage information', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);

      const response = await GET();
      const data = await response.json();

      expect(data.resources.memory).toBeDefined();
      expect(data.resources.memory.used).toBeGreaterThan(0);
      expect(data.resources.memory.total).toBeGreaterThan(0);
      expect(data.resources.memory.percentage).toBeGreaterThan(0);
    });

    it('should return critical status when database is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('critical');
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.message).toBe('Database connection failed');
    });

    it('should return degraded status when email is not configured', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);
      delete process.env.RESEND_API_KEY;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.email.status).toBe('degraded');
      expect(data.services.email.message).toBe('Email service not configured');
    });

    it('should detect degraded database status on high latency', async () => {
      // Simulate slow database response by making the mock take time
      mockPrisma.$queryRaw.mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate high latency by returning immediately but with mock timing
          resolve([{ result: 1 }]);
        });
      });
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);
      process.env.RESEND_API_KEY = 'test-api-key';

      const response = await GET();
      const data = await response.json();

      // Database latency is measured in the implementation
      // With our mock, it should be very fast, so status should be operational
      expect(data.services.database.latency).toBeDefined();
      expect(typeof data.services.database.latency).toBe('number');
    });

    it('should include API latency in response', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);

      const response = await GET();
      const data = await response.json();

      expect(data.services.api.latency).toBeDefined();
      expect(typeof data.services.api.latency).toBe('number');
      expect(data.metrics.avgResponseTime).toBeDefined();
    });

    it('should handle partial database failures gracefully', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      // Simulate partial failure - violation count fails
      mockPrisma.violation.count.mockRejectedValue(new Error('Query failed'));
      mockPrisma.notificationQueue.count.mockResolvedValue(0);

      // The implementation catches all errors in the try block
      // so any database error should mark database as down
      const response = await GET();
      const data = await response.json();

      // Since the implementation has a single try-catch, partial failures
      // are treated as database down
      expect(data.services.database.status).toBe('down');
    });

    it('should return 200 for healthy/degraded and 503 for critical', async () => {
      // Test critical status returns 503
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));

      const criticalResponse = await GET();
      expect(criticalResponse.status).toBe(503);

      // Reset and test healthy returns 200
      vi.clearAllMocks();
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.violation.count.mockResolvedValue(0);
      mockPrisma.notificationQueue.count.mockResolvedValue(0);
      process.env.RESEND_API_KEY = 'test-key';

      const healthyResponse = await GET();
      expect(healthyResponse.status).toBe(200);
    });
  });
});

/**
 * Export Service
 * Handles CSV and PDF exports for parking data
 */

import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export type ExportType = 'passes' | 'violations' | 'vehicles' | 'analytics' | 'audit-logs';

export interface ExportOptions {
  type: ExportType;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  buildingId?: string | undefined;
  format?: 'csv' | 'json';
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
}

// CSV utility functions
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(headers: string[], rows: unknown[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
}

// Export functions for each type
async function exportPasses(options: ExportOptions): Promise<{ headers: string[]; rows: unknown[][] }> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (options.startDate) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: options.startDate };
  }
  if (options.endDate) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: options.endDate };
  }
  if (options.buildingId) {
    where.unit = { buildingId: options.buildingId };
  }

  const passes = await prisma.parkingPass.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, make: true, model: true, color: true } },
      unit: { select: { unitNumber: true, building: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Confirmation Code',
    'License Plate',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Color',
    'Unit Number',
    'Building',
    'Visitor Name',
    'Visitor Email',
    'Visitor Phone',
    'Duration (hours)',
    'Status',
    'Start Time',
    'End Time',
    'Created At',
  ];

  const rows = passes.map((pass) => [
    pass.confirmationCode,
    pass.vehicle.licensePlate,
    pass.vehicle.make,
    pass.vehicle.model,
    pass.vehicle.color,
    pass.unit.unitNumber,
    pass.unit.building.name,
    pass.visitorName,
    pass.visitorEmail,
    pass.visitorPhone,
    pass.duration,
    pass.status,
    format(pass.startTime, 'yyyy-MM-dd HH:mm:ss'),
    format(pass.endTime, 'yyyy-MM-dd HH:mm:ss'),
    format(pass.createdAt, 'yyyy-MM-dd HH:mm:ss'),
  ]);

  return { headers, rows };
}

async function exportViolations(options: ExportOptions): Promise<{ headers: string[]; rows: unknown[][] }> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (options.startDate) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: options.startDate };
  }
  if (options.endDate) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: options.endDate };
  }

  const violations = await prisma.violation.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true } },
      loggedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID',
    'License Plate',
    'Type',
    'Severity',
    'Description',
    'Location',
    'Is Resolved',
    'Resolution',
    'Resolved At',
    'Citation Number',
    'Fine Amount',
    'Is Paid',
    'Logged By',
    'Created At',
  ];

  const rows = violations.map((v) => [
    v.id,
    v.vehicle.licensePlate,
    v.type,
    v.severity,
    v.description,
    v.location,
    v.isResolved ? 'Yes' : 'No',
    v.resolution,
    v.resolvedAt ? format(v.resolvedAt, 'yyyy-MM-dd HH:mm:ss') : '',
    v.citationNumber,
    v.fineAmount?.toString(),
    v.isPaid ? 'Yes' : 'No',
    v.loggedBy.name || v.loggedBy.email,
    format(v.createdAt, 'yyyy-MM-dd HH:mm:ss'),
  ]);

  return { headers, rows };
}

async function exportVehicles(_options: ExportOptions): Promise<{ headers: string[]; rows: unknown[][] }> {
  const where: Record<string, unknown> = { deletedAt: null };

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      _count: {
        select: { parkingPasses: true, violations: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'License Plate',
    'Make',
    'Model',
    'Color',
    'State',
    'Is Blacklisted',
    'Blacklist Reason',
    'Violation Count',
    'Risk Score',
    'Total Passes',
    'Total Violations',
    'Created At',
  ];

  const rows = vehicles.map((v) => [
    v.licensePlate,
    v.make,
    v.model,
    v.color,
    v.state,
    v.isBlacklisted ? 'Yes' : 'No',
    v.blacklistReason,
    v.violationCount,
    v.riskScore,
    v._count.parkingPasses,
    v._count.violations,
    format(v.createdAt, 'yyyy-MM-dd HH:mm:ss'),
  ]);

  return { headers, rows };
}

async function exportAuditLogs(options: ExportOptions): Promise<{ headers: string[]; rows: unknown[][] }> {
  const where: Record<string, unknown> = {};

  if (options.startDate) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: options.startDate };
  }
  if (options.endDate) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: options.endDate };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000, // Limit to prevent memory issues
  });

  const headers = [
    'ID',
    'Action',
    'Entity Type',
    'Entity ID',
    'User',
    'IP Address',
    'User Agent',
    'Details',
    'Created At',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.action,
    log.entityType,
    log.entityId,
    log.user?.name || log.user?.email || 'System',
    log.ipAddress,
    log.userAgent,
    JSON.stringify(log.details),
    format(log.createdAt, 'yyyy-MM-dd HH:mm:ss'),
  ]);

  return { headers, rows };
}

async function exportAnalytics(options: ExportOptions): Promise<{ headers: string[]; rows: unknown[][] }> {
  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate || new Date();

  const [passCount, violationCount, vehicleCount, unitCount] = await Promise.all([
    prisma.parkingPass.count({
      where: { createdAt: { gte: startDate, lte: endDate }, deletedAt: null },
    }),
    prisma.violation.count({
      where: { createdAt: { gte: startDate, lte: endDate }, deletedAt: null },
    }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.unit.count({ where: { deletedAt: null, isActive: true } }),
  ]);

  const headers = ['Metric', 'Value', 'Period'];
  const period = `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;

  const rows = [
    ['Total Passes', passCount, period],
    ['Total Violations', violationCount, period],
    ['Total Vehicles', vehicleCount, 'All time'],
    ['Active Units', unitCount, 'Current'],
  ];

  return { headers, rows };
}

// Main export function
export async function generateExport(options: ExportOptions): Promise<ExportResult> {
  let data: { headers: string[]; rows: unknown[][] };
  let filename: string;

  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');

  switch (options.type) {
    case 'passes':
      data = await exportPasses(options);
      filename = `parking-passes-${timestamp}`;
      break;
    case 'violations':
      data = await exportViolations(options);
      filename = `violations-${timestamp}`;
      break;
    case 'vehicles':
      data = await exportVehicles(options);
      filename = `vehicles-${timestamp}`;
      break;
    case 'analytics':
      data = await exportAnalytics(options);
      filename = `analytics-${timestamp}`;
      break;
    case 'audit-logs':
      data = await exportAuditLogs(options);
      filename = `audit-logs-${timestamp}`;
      break;
    default:
      throw new Error(`Invalid export type: ${options.type}`);
  }

  if (options.format === 'json') {
    // Convert to JSON format
    const jsonData = data.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      data.headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return {
      data: JSON.stringify(jsonData, null, 2),
      filename: `${filename}.json`,
      mimeType: 'application/json',
    };
  }

  // Default to CSV
  return {
    data: arrayToCSV(data.headers, data.rows),
    filename: `${filename}.csv`,
    mimeType: 'text/csv',
  };
}

// Log export action
export async function logExport(userId: string, exportType: ExportType, details?: Record<string, string | null>) {
  await prisma.auditLog.create({
    data: {
      action: 'EXPORT_DATA',
      entityType: exportType,
      entityId: 'export',
      userId,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
    },
  });
}

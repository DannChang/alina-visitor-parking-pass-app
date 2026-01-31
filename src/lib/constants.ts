/**
 * Application Constants
 * Centralized configuration for the parking pass system
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'Alina Visitor Parking',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  description: 'Visitor parking pass management system',
} as const;

export const PASS_CONFIG = {
  // Default duration options in hours
  defaultDurations: [2, 4, 8, 12, 24, 48, 72],

  // Maximum values
  maxDurationHours: 72,
  maxExtensions: 1,
  maxExtensionHours: 4,

  // Timing
  expirationWarningMinutes: 30,
  gracePeriodMinutes: 15,

  // Limits
  maxVehiclesPerUnit: 2,
  maxConsecutiveHours: 24,
  cooldownHours: 2,
} as const;

export const LICENSE_PLATE_CONFIG = {
  minLength: 2,
  maxLength: 10,
  validPattern: /^[A-Z0-9]{2,10}$/,
  formatPattern: /^([A-Z0-9]{1,4})\s*([A-Z0-9]{0,6})$/,
} as const;

export const VALIDATION_MESSAGES = {
  licensePlate: {
    required: 'License plate is required',
    invalid: 'Invalid license plate format',
    minLength: `License plate must be at least ${LICENSE_PLATE_CONFIG.minLength} characters`,
    maxLength: `License plate must not exceed ${LICENSE_PLATE_CONFIG.maxLength} characters`,
    blacklisted: 'This vehicle is not permitted to park',
  },
  unit: {
    required: 'Unit number is required',
    invalid: 'Invalid unit number',
    notFound: 'Unit not found',
  },
  duration: {
    required: 'Duration is required',
    invalid: 'Invalid duration selected',
    tooLong: `Duration cannot exceed ${PASS_CONFIG.maxDurationHours} hours`,
  },
  visitor: {
    nameRequired: 'Visitor name is required',
    emailInvalid: 'Invalid email address',
    phoneInvalid: 'Invalid phone number',
  },
} as const;

export const ERROR_CODES = {
  // Validation errors (4000-4099)
  BLACKLISTED: 'ERR_4000',
  MAX_VEHICLES_EXCEEDED: 'ERR_4001',
  MAX_CONSECUTIVE_HOURS: 'ERR_4002',
  COOLDOWN_PERIOD: 'ERR_4003',
  INVALID_DURATION: 'ERR_4004',
  OUTSIDE_OPERATING_HOURS: 'ERR_4005',

  // Authentication errors (4100-4199)
  UNAUTHORIZED: 'ERR_4100',
  FORBIDDEN: 'ERR_4101',
  INVALID_TOKEN: 'ERR_4102',

  // Database errors (5000-5099)
  DATABASE_ERROR: 'ERR_5000',
  NOT_FOUND: 'ERR_5001',
  DUPLICATE: 'ERR_5002',

  // System errors (5100-5199)
  INTERNAL_ERROR: 'ERR_5100',
  RATE_LIMIT_EXCEEDED: 'ERR_5101',
} as const;

export const RATE_LIMITS = {
  // Public endpoints
  registration: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  passLookup: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
  },

  // Auth endpoints
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },

  // API endpoints
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
  },
} as const;

export const VIOLATION_TYPES = {
  OVERSTAY: {
    label: 'Overstay',
    description: 'Vehicle exceeded registered parking duration',
    defaultSeverity: 'MEDIUM',
  },
  UNREGISTERED: {
    label: 'Unregistered',
    description: 'Vehicle parked without valid pass',
    defaultSeverity: 'HIGH',
  },
  IMPROPER_PARKING: {
    label: 'Improper Parking',
    description: 'Vehicle parked improperly',
    defaultSeverity: 'LOW',
  },
  BLOCKING: {
    label: 'Blocking',
    description: 'Vehicle blocking access',
    defaultSeverity: 'HIGH',
  },
  RESERVED_SPOT: {
    label: 'Reserved Spot',
    description: 'Parking in reserved/restricted area',
    defaultSeverity: 'MEDIUM',
  },
  EXPIRED_PASS: {
    label: 'Expired Pass',
    description: 'Pass has expired',
    defaultSeverity: 'MEDIUM',
  },
  FRAUDULENT_REGISTRATION: {
    label: 'Fraudulent Registration',
    description: 'False or fraudulent registration',
    defaultSeverity: 'CRITICAL',
  },
  EMERGENCY_LANE_VIOLATION: {
    label: 'Emergency Lane Violation',
    description: 'Blocking emergency vehicle access',
    defaultSeverity: 'CRITICAL',
  },
  HANDICAP_VIOLATION: {
    label: 'Handicap Violation',
    description: 'Illegal use of handicap spot',
    defaultSeverity: 'HIGH',
  },
  OTHER: {
    label: 'Other',
    description: 'Other violation',
    defaultSeverity: 'LOW',
  },
} as const;

export const PASS_STATUSES = {
  PENDING: {
    label: 'Pending',
    color: 'yellow',
    description: 'Awaiting confirmation',
  },
  ACTIVE: {
    label: 'Active',
    color: 'green',
    description: 'Currently valid',
  },
  EXPIRED: {
    label: 'Expired',
    color: 'red',
    description: 'Pass has expired',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'gray',
    description: 'Cancelled by user or admin',
  },
  EXTENDED: {
    label: 'Extended',
    color: 'blue',
    description: 'Duration extended',
  },
  SUSPENDED: {
    label: 'Suspended',
    color: 'orange',
    description: 'Temporarily suspended',
  },
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Full system access',
    permissions: ['all'],
  },
  ADMIN: {
    label: 'Admin',
    description: 'Building administrator',
    permissions: ['manage_users', 'manage_settings', 'manage_passes', 'manage_violations'],
  },
  MANAGER: {
    label: 'Manager',
    description: 'Building manager',
    permissions: ['manage_passes', 'manage_violations', 'view_reports'],
  },
  SECURITY: {
    label: 'Security',
    description: 'Security personnel',
    permissions: ['view_passes', 'log_violations', 'view_reports'],
  },
  RESIDENT: {
    label: 'Resident',
    description: 'Unit resident',
    permissions: ['view_own_passes', 'pre_register'],
  },
} as const;

export const EMAIL_TEMPLATES = {
  PASS_CONFIRMATION: 'pass-confirmation',
  PASS_EXPIRING: 'pass-expiring',
  PASS_EXPIRED: 'pass-expired',
  VIOLATION_NOTICE: 'violation-notice',
  WELCOME: 'welcome',
} as const;

export const API_ROUTES = {
  // Public
  register: '/api/passes',
  validatePass: '/api/passes/validate',
  extendPass: '/api/passes/extend',
  passLookup: '/api/passes/lookup',

  // Auth
  login: '/api/auth/signin',
  logout: '/api/auth/signout',

  // Admin
  vehicles: '/api/vehicles',
  violations: '/api/violations',
  units: '/api/units',
  analytics: '/api/analytics',
  export: '/api/export',
  health: '/api/health',
} as const;

export const QR_CODE_CONFIG = {
  size: 400,
  margin: 2,
  errorCorrectionLevel: 'M',
  imageFormat: 'png',
} as const;

export const TIMEZONE_DEFAULT = 'America/New_York';

export const DATE_FORMATS = {
  display: 'MMM dd, yyyy h:mm a',
  short: 'MMM dd, yyyy',
  time: 'h:mm a',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

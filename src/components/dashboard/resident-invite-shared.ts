export type ResidentInviteStatus = 'PENDING' | 'EXPIRED' | 'REVOKED' | 'CONSUMED';

export interface ResidentInviteBuildingOption {
  id: string;
  name: string;
  slug: string;
}

export interface ResidentInviteUnitOption {
  id: string;
  buildingId: string;
  buildingName: string;
  unitNumber: string;
  hasPrimaryResident: boolean;
  hasPendingInvite: boolean;
  isAvailableForInvite: boolean;
}

export interface ResidentInviteSummary {
  id: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  status: ResidentInviteStatus;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  consumedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  building: {
    id: string;
    name: string;
    slug: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
  issuer: {
    id: string;
    name: string | null;
    email: string;
  };
  resident: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  user: {
    id: string;
    email: string;
  } | null;
}

export interface ResidentInviteMutationResult {
  invite: ResidentInviteSummary;
  registrationUrl: string;
  emailSent: boolean;
}

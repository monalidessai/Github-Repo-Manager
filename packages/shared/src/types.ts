import { BadgeStatus } from './constants';

export type UserRole = 'ADMIN' | 'USER';
export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export interface UserSession {
  username: string;
  avatarUrl: string;
  name?: string;
  accessToken: string;
  role: UserRole;
}

export type AccessStatus = 'Active Outside Access' | 'Clean / Revoked' | 'Internal Only';
export type RepoLifecycleStatus = 'Live' | 'Archived' | 'Pending Deletion';

export interface RepoItem {
  name: string;
  candidateName: string;
  role: string;
  createdAt: string;
  daysSinceCreation: number;
  daysRemaining: number;
  badgeStatus: BadgeStatus;
  accessStatus: AccessStatus;
  repoStatus: RepoLifecycleStatus;
  isArchived: boolean;
  htmlUrl: string;
  collaboratorsCount?: number;
  outsideCollaboratorsCount?: number;
  customExpiryDate?: string | null;
  customAction?: 'delete' | 'archive' | null;
}

export interface CollaboratorItem {
  username: string;
  avatarUrl: string;
  roleName: string;
  isOutside: boolean;
  isOutsideCollaborator: boolean;
  isOrganizationMember: boolean;
  isOrganizationOwner: boolean;
  canRevokeAccess: boolean;
}


export interface SimulationStateDto {
  offsetDays: number;
  realDate: string;
  effectiveDate: string;
  isSimulated: boolean;
}

export interface SystemConfigDto {
  repoPrefix: string;
  retentionDays: number;
  warningDays: number;
  defaultExpiryAction: 'delete' | 'archive';
  githubOrg?: string;
  simulationEnabled?: boolean;
}

export interface AuditLogDto {
  id: string;
  actor: string;
  action: string;
  repository: string;
  timestamp: string;
  ipAddress: string;
  context?: Record<string, any>;
  previousHash?: string | null;
  hash: string;
}

export interface NotificationDto {
  id: string;
  repoName: string;
  message: string;
  severity: 'warning' | 'danger';
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

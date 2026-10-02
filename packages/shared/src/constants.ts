export const DEFAULT_REPO_PREFIX = 'pt-';
export const DEFAULT_RETENTION_DAYS = 90;
export const DEFAULT_WARNING_DAYS = 7;
export const EXPIRY_ACTIONS = ['delete', 'archive'] as const;

export const BadgeStatus = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
  EXPIRED: 'EXPIRED',
} as const;

export type BadgeStatus = (typeof BadgeStatus)[keyof typeof BadgeStatus];

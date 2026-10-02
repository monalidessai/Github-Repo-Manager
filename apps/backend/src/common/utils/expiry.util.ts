export interface RepoExpiryInfo {
  expiryDate: Date;
  remainingDays: number;
  isExpired: boolean;
  targetAction: 'delete' | 'archive';
}

export function calculateRepoExpiry(
  createdAt: Date,
  config: { retentionDays: number; defaultExpiryAction: 'delete' | 'archive' },
  override?: { customExpiryDate?: Date | null; customAction?: string | null },
  now: Date = new Date(),
  isArchived?: boolean,
): RepoExpiryInfo {
  let expiryDate: Date;
  let targetAction = config.defaultExpiryAction;

  if (override && override.customExpiryDate) {
    expiryDate = new Date(override.customExpiryDate);
    if (override.customAction) {
      targetAction = override.customAction as 'delete' | 'archive';
    }
  } else {
    expiryDate = new Date(createdAt.getTime() + config.retentionDays * 24 * 60 * 60 * 1000);
  }

  if (isArchived) {
    return {
      expiryDate,
      remainingDays: 0,
      isExpired: true,
      targetAction,
    };
  }

  const remainingDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = remainingDays <= 0;

  return {
    expiryDate,
    remainingDays,
    isExpired,
    targetAction,
  };
}

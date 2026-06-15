import type { SubscriptionTier } from '../auth/user.types';

export interface UsageQuota {
  tier: SubscriptionTier;
  generationsUsed: number;
  generationsLimit: number;
  periodStart: string; // ISO-8601
  periodEnd: string;   // ISO-8601
}

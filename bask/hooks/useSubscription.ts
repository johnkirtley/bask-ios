'use client';

import { useSubscriptionContext } from '../contexts/SubscriptionContext';

/** Thin wrapper around SubscriptionProvider context (single RevenueCat init). */
export function useSubscription() {
  return useSubscriptionContext();
}

'use client';

import { useEffect } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { userProfileRepository } from '../../lib/database/repositories/userProfileRepository';
import { initAnalytics, identifyUser } from '../../lib/analytics';

/**
 * Initializes PostHog once on mount and attaches (non-PII) person properties as
 * the user profile and subscription state become available. Must live inside
 * SubscriptionProvider. Renders nothing.
 */
export default function AnalyticsBootstrap() {
  const { isPremium, isInitialized } = useSubscription();

  // Initialize as early as possible so pre-onboarding events are captured.
  useEffect(() => {
    initAnalytics();
  }, []);

  // Attach person properties once subscription state has resolved.
  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    userProfileRepository
      .get()
      .then((profile) => {
        if (cancelled) return;
        identifyUser({
          fitzpatrick_type: profile?.fitzpatrick_type ?? null,
          age: profile?.age ?? null,
          weight_unit: profile?.weight_unit ?? null,
          daily_goal: profile?.daily_goal ?? null,
          subscription_tier: isPremium ? 'premium' : 'free',
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Profile not available yet — still record the subscription tier.
        identifyUser({ subscription_tier: isPremium ? 'premium' : 'free' });
      });

    return () => {
      cancelled = true;
    };
  }, [isInitialized, isPremium]);

  return null;
}

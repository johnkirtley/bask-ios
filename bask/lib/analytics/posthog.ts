'use client';

import posthog from 'posthog-js';
import { Capacitor } from '@capacitor/core';
import { POSTHOG, ANALYTICS_SETTINGS } from '../constants';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

/**
 * Thin, typed wrapper around posthog-js.
 *
 * - No-op when NEXT_PUBLIC_POSTHOG_KEY is empty (dev/CI run clean).
 * - Manual events + manual pageviews only: autocapture and session replay are OFF.
 * - Uses a stable anonymous distinct_id generated once and kept in localStorage
 *   (works in both the browser and the Capacitor webview, no DB dependency,
 *   survives across the onboarding/app boundary so funnels stay connected).
 */

let initialized = false;

function isEnabled(): boolean {
  return typeof window !== 'undefined' && POSTHOG.key.length > 0;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateDistinctId(): string {
  try {
    const existing = localStorage.getItem(ANALYTICS_SETTINGS.distinctId);
    if (existing) return existing;
    const id = generateId();
    localStorage.setItem(ANALYTICS_SETTINGS.distinctId, id);
    return id;
  } catch {
    // localStorage unavailable — fall back to an ephemeral id for this session.
    return generateId();
  }
}

/** Person properties attached to the (anonymous) user. No PII. */
export interface AnalyticsPersonProperties {
  fitzpatrick_type?: number | null;
  age?: number | null;
  weight_unit?: string | null;
  daily_goal?: number | null;
  subscription_tier?: 'free' | 'premium';
}

/** Initialize PostHog once. Safe to call multiple times. */
export function initAnalytics(): void {
  if (initialized || !isEnabled()) return;
  initialized = true;

  const distinctId = getOrCreateDistinctId();

  posthog.init(POSTHOG.key, {
    api_host: POSTHOG.host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    bootstrap: { distinctID: distinctId },
    loaded: (ph) => {
      ph.identify(distinctId, { platform: Capacitor.getPlatform() });
    },
  });
}

/** Update person properties for the current user. */
export function identifyUser(props: AnalyticsPersonProperties): void {
  if (!isEnabled() || !initialized) return;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && value !== null) cleaned[key] = value;
  }
  if (Object.keys(cleaned).length > 0) {
    posthog.setPersonProperties(cleaned);
  }
}

/** Capture a typed analytics event. Properties are required iff the event defines them. */
export function capture<E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEventProps[E] extends void ? [] : [AnalyticsEventProps[E]]
): void {
  if (!isEnabled() || !initialized) return;
  posthog.capture(event, args[0] as Record<string, unknown> | undefined);
}

/** Manually record a screen/page view (auto-pageview is off). */
export function trackPageview(path: string): void {
  if (!isEnabled() || !initialized) return;
  posthog.capture('$pageview', { $current_url: path });
}

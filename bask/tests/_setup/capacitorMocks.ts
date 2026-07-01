/**
 * Test setup for jsdom/integration tests (loaded via vitest.all.config.ts setupFiles).
 *
 * Registers module mocks that the React/service code imports at module
 * top-level and which would otherwise crash in jsdom/node:
 *  - @capacitor/core, haptics, app, browser
 *  - @capacitor/local-notifications (inspectable)
 *  - lib/plugins (BaskLiveActivity / BaskHealth / BaskWeather)
 *  - lib/analytics (real events taxonomy, stubbed capture)
 *  - lib/services/inAppReviewService + lib/supabase/leaderboardService
 *  - lib/database/connection (in-memory fake SQLite)
 *
 * Exports toggle/reset helpers for use in beforeEach.
 */

import { vi } from 'vitest';
import { createFakeDb, type FakeDb } from './fakeDb';
import {
  createLocalNotificationsMock,
  resetLocalNotifications,
  setNotificationPermission as setNotificationPermissionImpl,
} from './localNotificationsMock';

// --- hoisted mutable state (referenced by hoisted mock factories) ---
const platform = vi.hoisted(() => ({ native: true }));
const fakeHolder = vi.hoisted(() => ({ db: null as FakeDb | null }));

fakeHolder.db = createFakeDb();

// --- @capacitor/core ---
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => (platform.native ? 'ios' : 'web'),
    isPluginAvailable: () => true,
    convertFileSrc: (v: string) => v,
  },
  registerPlugin: () => ({}),
}));

// --- @capacitor/haptics ---
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    selectionStart: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
    selectionEnd: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

// --- @capacitor/app ---
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    getLaunchUrl: vi.fn().mockResolvedValue({ url: '' }),
  },
}));

// --- @capacitor/browser ---
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    prefetch: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- @capacitor/local-notifications (inspectable) ---
vi.mock('@capacitor/local-notifications', () => createLocalNotificationsMock());

// --- lib/plugins (native Live Activity / Weather / Health) ---
vi.mock('@/lib/plugins', () => ({
  BaskLiveActivity: {
    isSupported: vi.fn().mockResolvedValue(false),
    startActivity: vi.fn().mockResolvedValue(undefined),
    updateActivity: vi.fn().mockResolvedValue(undefined),
    endActivity: vi.fn().mockResolvedValue(undefined),
    endAllActivities: vi.fn().mockResolvedValue(undefined),
  },
  BaskHealth: {
    getTimeInDaylight: vi.fn().mockResolvedValue({ minutes: 0 }),
    saveDaylightExposure: vi.fn().mockResolvedValue(undefined),
  },
  BaskWeather: {
    getWeather: vi.fn().mockResolvedValue(null),
  },
  LiveActivityPhase: {},
}));

// --- lib/analytics (real events, stubbed capture) ---
vi.mock('@/lib/analytics', async () => {
  const events = await vi.importActual<any>('@/lib/analytics/events');
  return {
    capture: vi.fn(),
    initAnalytics: vi.fn(),
    identifyUser: vi.fn(),
    trackPageview: vi.fn(),
    ...events,
  };
});

// --- lib/services/inAppReviewService ---
vi.mock('@/lib/services/inAppReviewService', () => ({
  recordReviewValueEvent: vi.fn(),
  shouldShowReviewPrompt: vi.fn().mockReturnValue(false),
  markReviewPromptShown: vi.fn(),
  inAppReviewService: { recordReviewValueEvent: vi.fn(), shouldShowReviewPrompt: vi.fn() },
}));

// --- lib/supabase/leaderboardService ---
vi.mock('@/lib/supabase/leaderboardService', () => ({
  leaderboardService: {
    submitSession: vi.fn().mockResolvedValue(undefined),
    submitStreak: vi.fn().mockResolvedValue(undefined),
    deleteLeaderboardData: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- lib/database/connection -> in-memory fake ---
vi.mock('@/lib/database/connection', () => ({
  databaseService: fakeHolder.db!.databaseService,
}));

// --- exported helpers for tests ---

export function setNative(value: boolean) {
  platform.native = value;
  fakeHolder.db!.setNative(value);
}

export function resetNative() {
  setNative(true);
}

export function getFakeDb(): FakeDb {
  return fakeHolder.db!;
}

/** Reset fake DB (optionally reseed) and notification mock state. */
export function resetBackend(seed?: Parameters<FakeDb['reset']>[0]) {
  fakeHolder.db!.reset(seed);
  resetLocalNotifications();
  resetNative();
}

export function setNotificationPermission(value: 'granted' | 'denied' | 'prompt') {
  setNotificationPermissionImpl(value);
}

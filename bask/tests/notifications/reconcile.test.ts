// @vitest-environment jsdom
/**
 * reconcileDWindowNotifications — the orchestration layer.
 * Covers the schedule path, denied-permission cancel path, dedupe via
 * reconcileKey, force bypass, and missing-forecast cancellation.
 *
 * The service holds module-level dedupe state (lastReconcileKey/lastForecast),
 * so each test re-imports a fresh module instance via vi.resetModules().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { resetBackend, setNotificationPermission } from '../_setup/capacitorMocks';
import { getLocalNotificationsState } from '../_setup/localNotificationsMock';
import { makeForecast } from '../_setup/notificationFixtures';
import { notificationService as staticService } from '@/lib/services/notificationService';

async function freshService() {
  vi.resetModules();
  return (await import('@/lib/services/notificationService')).notificationService;
}

describe('reconcileDWindowNotifications', () => {
  beforeEach(() => resetBackend());

  it('schedules notifications when premium, enabled, permitted, and forecast is schedulable', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await svc.reconcileDWindowNotifications({
      forecast: makeForecast(),
      isPremium: true,
    });

    expect(getLocalNotificationsState().scheduled.length).toBeGreaterThan(0);
  });

  it('cancels (and does not schedule) when permission is denied', async () => {
    const svc = await freshService();
    setNotificationPermission('denied');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await svc.reconcileDWindowNotifications({
      forecast: makeForecast(),
      isPremium: true,
    });

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
    expect(getLocalNotificationsState().cancelled.length).toBeGreaterThan(0);
  });

  it('cancels when there is no forecast', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await svc.reconcileDWindowNotifications({ forecast: null, isPremium: true });

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
    expect(getLocalNotificationsState().cancelled.length).toBeGreaterThan(0);
  });

  it('cancels when not premium', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await svc.reconcileDWindowNotifications({
      forecast: makeForecast(),
      isPremium: false,
    });

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });

  it('dedupes: a second identical call does not reschedule', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    const forecast = makeForecast();

    await svc.reconcileDWindowNotifications({ forecast, isPremium: true });
    const afterFirst = getLocalNotificationsState().scheduled.length;
    expect(afterFirst).toBeGreaterThan(0);

    getLocalNotificationsState().scheduled.length = 0; // reset counter
    getLocalNotificationsState().cancelled.length = 0;

    await svc.reconcileDWindowNotifications({ forecast, isPremium: true });
    // Dedupe: no new schedule, no cancel
    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
    expect(getLocalNotificationsState().cancelled).toHaveLength(0);
  });

  it('force: true bypasses dedupe', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    const forecast = makeForecast();

    await svc.reconcileDWindowNotifications({ forecast, isPremium: true });
    getLocalNotificationsState().scheduled.length = 0;

    await svc.reconcileDWindowNotifications({ forecast, isPremium: true, force: true });
    expect(getLocalNotificationsState().scheduled.length).toBeGreaterThan(0);
  });

  it('caches lastForecast for applySettingsChange (reconciles from cache)', async () => {
    const svc = await freshService();
    setNotificationPermission('granted');
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    const forecast = makeForecast();

    await svc.reconcileDWindowNotifications({ forecast, isPremium: true });
    getLocalNotificationsState().scheduled.length = 0;
    getLocalNotificationsState().cancelled.length = 0;

    // applySettingsChange re-reconciles with the cached forecast (force)
    await svc.applySettingsChange({ isPremium: true });
    expect(getLocalNotificationsState().scheduled.length).toBeGreaterThan(0);
  });

  it('is a no-op on non-native platforms', async () => {
    const { setNative } = await import('../_setup/capacitorMocks');
    const svc = await freshService();
    setNative(false);
    await svc.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    setNotificationPermission('granted');

    await svc.reconcileDWindowNotifications({
      forecast: makeForecast(),
      isPremium: true,
    });

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
    expect(getLocalNotificationsState().cancelled).toHaveLength(0);
    setNative(true);
  });
});

describe('static service module', () => {
  it('the top-level import resolves the same singleton surface', () => {
    expect(typeof staticService.reconcileDWindowNotifications).toBe('function');
    expect(typeof staticService.scheduleDWindowNotifications).toBe('function');
  });
});

// @vitest-environment jsdom
/**
 * Phase 0 sanity check: verifies the test infrastructure composes correctly.
 *   - jsdom environment loads
 *   - @testing-library/react renderHook works
 *   - Capacitor native toggle works
 *   - a real repository (sessionsRepository) round-trips through the fake DB
 * If this passes, every mock seam in tests/_setup is wired correctly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { sessionsRepository } from '@/lib/database';
import { getFakeDb, resetBackend, setNative, setNotificationPermission } from '../_setup/capacitorMocks';
import { getLocalNotificationsState } from '../_setup/localNotificationsMock';

describe('infrastructure sanity', () => {
  beforeEach(() => resetBackend());

  it('renders a hook under jsdom + RTL', () => {
    const { result } = renderHook(() => ({ ok: true }));
    expect(result.current.ok).toBe(true);
  });

  it('Capacitor native toggle flips isNativePlatform', async () => {
    const { Capacitor } = await import('@capacitor/core');
    expect(Capacitor.isNativePlatform()).toBe(true);
    setNative(false);
    expect(Capacitor.isNativePlatform()).toBe(false);
    setNative(true);
  });

  it('sessionsRepository.create + getById round-trips through the fake DB', async () => {
    const id = await sessionsRepository.create({
      started_at: new Date().toISOString(),
      uv_index: 5,
      clothing_preset_id: 'tshirt',
      exposure_percent: 40,
    });
    expect(id).toBeGreaterThan(0);

    const row = await sessionsRepository.getById(id);
    expect(row?.uv_index).toBe(5);
    expect(row?.clothing_preset_id).toBe('tshirt');
    expect(row?.source).toBe('manual'); // default applied
  });

  it('local-notifications mock records schedule + cancel', async () => {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    setNotificationPermission('granted');
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'x' }] });
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    const state = getLocalNotificationsState();
    expect(state.scheduled).toHaveLength(1);
    expect(state.cancelled).toHaveLength(1);
  });

  it('fake DB reset reseeds tables', () => {
    const db = getFakeDb();
    db.reset({ bask_sessions: [{ id: 42, started_at: '2025-01-01T00:00:00.000Z', source: 'manual' }] });
    expect(db.getTable('bask_sessions')).toHaveLength(1);
    db.reset();
    expect(db.getTable('bask_sessions')).toHaveLength(0);
  });
});

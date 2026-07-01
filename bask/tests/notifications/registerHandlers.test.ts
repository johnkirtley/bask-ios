// @vitest-environment jsdom
/**
 * registerHandlers — action-type registration + listener wiring.
 * Uses fireLocalNotificationListener to simulate OS-delivered events and
 * verifies the streak-revival received-listener patches state, and the
 * action-performed listener scrolls on the home path.
 *
 * registerHandlers is idempotent via a module-level flag, so each test
 * re-imports a fresh module instance.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { streakStateRepository } from '@/lib/database/repositories/streakStateRepository';
import { resetBackend } from '../_setup/capacitorMocks';
import {
  fireLocalNotificationListener,
  getLocalNotificationsState,
} from '../_setup/localNotificationsMock';

async function freshService() {
  vi.resetModules();
  return (await import('@/lib/services/notificationService')).notificationService;
}

describe('registerHandlers', () => {
  beforeEach(() => resetBackend());

  it('registers the DWINDOW_REMINDER action type and both listeners', async () => {
    const svc = await freshService();
    await svc.registerHandlers();

    expect(getLocalNotificationsState().registeredActionTypes).toEqual([
      { id: 'DWINDOW_REMINDER', actions: [] },
    ]);
    expect(getLocalNotificationsState().actionListeners.has('localNotificationActionPerformed')).toBe(true);
    expect(getLocalNotificationsState().actionListeners.has('localNotificationReceived')).toBe(true);
  });

  it('streak_revival received-listener patches streakRevivalNotifFired', async () => {
    const svc = await freshService();
    await svc.registerHandlers();

    await fireLocalNotificationListener('localNotificationReceived', {
      extra: { type: 'streak_revival' },
    });

    const state = await streakStateRepository.get();
    expect(state.streakRevivalNotifFired).toBe(true);
    expect(state.lastRevivalNotifDate).not.toBeNull();
  });

  it('non-revival received events are ignored', async () => {
    const svc = await freshService();
    await svc.registerHandlers();
    await fireLocalNotificationListener('localNotificationReceived', {
      extra: { type: 'synthesis_start' },
    });
    const state = await streakStateRepository.get();
    expect(state.streakRevivalNotifFired).toBe(false);
  });

  it('action-performed listener scrolls to the forecast section on the home path', async () => {
    const svc = await freshService();
    await svc.registerHandlers();

    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    vi.spyOn(window.history, 'replaceState');

    const target = document.createElement('div');
    target.id = 'dwindow-forecast';
    document.body.appendChild(target);

    await fireLocalNotificationListener('localNotificationActionPerformed', {});

    expect(scrollSpy).toHaveBeenCalled();
    document.body.removeChild(target);
  });

  it('registers only once per module instance (idempotent)', async () => {
    const svc = await freshService();
    await svc.registerHandlers();
    await svc.registerHandlers();
    expect(getLocalNotificationsState().registeredActionTypes).toHaveLength(1);
  });
});

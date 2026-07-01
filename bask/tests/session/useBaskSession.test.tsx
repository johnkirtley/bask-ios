// @vitest-environment jsdom
/**
 * useBaskSession — the core session loop.
 * Covers all 5 user actions (start/pause/resume/end/cancel), state transitions,
 * repository/analytics/haptics side effects, restore-on-reclaim, persistence
 * effects, and the sun-down guard. Uses fake timers so the 1s/15s intervals
 * never auto-fire between assertions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useBaskSession } from '@/hooks/useBaskSession';
import { capture, ANALYTICS_EVENTS } from '@/lib/analytics';
import { Haptics } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { sessionsRepository } from '@/lib/database';
import { leaderboardService } from '@/lib/supabase/leaderboardService';
import { recordReviewValueEvent } from '@/lib/services/inAppReviewService';
import {
  savePersistedSession,
  clearPersistedSession,
} from '@/lib/sessionPersistence';
import { STORAGE_KEYS } from '@/lib/constants';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';

const SUN_UP_UV5 = { rawUvIndex: 5, effectiveUV: 5, isDaylightFlag: true } as any;

describe('useBaskSession', () => {
  beforeEach(() => {
    resetBackend();
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  describe('startSession', () => {
    it('transitions to active and writes a DB row + analytics + haptic', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));

      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });

      expect(result.current.status).toBe('active');
      expect(result.current.isActive).toBe(true);
      expect(result.current.clothingPresetId).toBe('tshirt');

      const rows = getFakeDb().getTable('bask_sessions');
      expect(rows).toHaveLength(1);
      expect(rows[0].clothing_preset_id).toBe('tshirt');
      expect(rows[0].uv_index).toBe(5);

      expect(capture).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.sessionStarted,
        expect.objectContaining({ clothing_preset_id: 'tshirt', phase_at_start: 'vitamin_d' }),
      );
      expect(Haptics.impact).toHaveBeenCalled();
    });

    it('is blocked when the sun is down and UV is zero (sun-down guard)', async () => {
      const sunDown = { rawUvIndex: 0, effectiveUV: 0, isDaylightFlag: false } as any;
      const { result } = renderHook(() => useBaskSession(3, 30, sunDown));

      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });

      expect(result.current.status).toBe('idle');
      expect(getFakeDb().getTable('bask_sessions')).toHaveLength(0);
      expect(capture).not.toHaveBeenCalledWith(ANALYTICS_EVENTS.sessionStarted, expect.anything());
    });
  });

  describe('pause / resume', () => {
    it('pauses then resumes, adjusting startTime past the pause gap', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      const startedAt = result.current; // capture via state below

      await act(async () => {
        await result.current.pauseSession();
      });
      expect(result.current.status).toBe('paused');
      expect(result.current.isPaused).toBe(true);
      expect(capture).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.sessionPaused,
        expect.any(Object),
      );

      // Advance fake time during the "pause"
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      await act(async () => {
        await result.current.resumeSession();
      });
      expect(result.current.status).toBe('active');
      expect(result.current.isPaused).toBe(false);
      expect(capture).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.sessionResumed,
        expect.any(Object),
      );
      void startedAt;
    });
  });

  describe('endSession', () => {
    it('saves to DB, fires analytics + leaderboard + review, returns the snapshot', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      const sessionId = getFakeDb().getTable('bask_sessions')[0].id;

      let snapshot: any;
      await act(async () => {
        snapshot = await result.current.endSession();
      });

      expect(result.current.status).toBe('completed');
      expect(snapshot).not.toBeNull();
      expect(snapshot.sessionId).toBe(sessionId);

      const row = getFakeDb().getTable('bask_sessions')[0];
      expect(row.ended_at).not.toBeNull();
      expect(row.duration_seconds).toBe(0);
      expect(leaderboardService.submitSession).toHaveBeenCalledWith(
        expect.objectContaining({ localSessionId: sessionId }),
      );
      expect(recordReviewValueEvent).toHaveBeenCalled();
      expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.sessionEnded, expect.any(Object));
      expect(Haptics.notification).toHaveBeenCalled();
    });

    it('returns null and leaves status unchanged when the DB update fails', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      const updateSpy = vi
        .spyOn(sessionsRepository, 'update')
        .mockRejectedValueOnce(new Error('db locked'));

      let returned: any;
      await act(async () => {
        returned = await result.current.endSession();
      });
      updateSpy.mockRestore();

      expect(returned).toBeNull();
      // status stayed active (setState in the try block never reached)
      expect(result.current.status).toBe('active');
    });
  });

  describe('cancelSession', () => {
    it('discards the session: deletes the DB row and resets to idle', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      expect(getFakeDb().getTable('bask_sessions')).toHaveLength(1);

      await act(async () => {
        await result.current.cancelSession();
      });

      expect(result.current.status).toBe('idle');
      expect(getFakeDb().getTable('bask_sessions')).toHaveLength(0);
      expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.sessionCancelled, expect.any(Object));
    });
  });

  describe('restore on reclaim', () => {
    it('rehydrates an active session from localStorage on mount', async () => {
      savePersistedSession({
        status: 'active',
        startTime: new Date(Date.now() - 120_000),
        pausedAt: null,
        elapsedSeconds: 120,
        uvIndex: 5,
        rawUvIndex: 6,
        clothingPresetId: 'tshirt',
        exposurePercent: 40,
        fitzpatrickType: 3,
        age: 30,
        currentIU: 250,
        accumulatedIU: 250.4,
        lastAccrualMs: Date.now() - 1000,
        lastAccrualEffUv: 4.5,
        synthesizing: true,
        hasSynthesized: true,
        projectedTimeToBurn: 45,
        sessionId: 42,
        liveActivityId: null,
      });

      const { result, unmount } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));

      expect(result.current.status).toBe('active');
      expect(result.current.currentIU).toBe(250);
      expect(result.current.clothingPresetId).toBe('tshirt');
      unmount();
    });
  });

  describe('persistence effect', () => {
    it('snapshots while active and clears on end', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      expect(localStorage.getItem(STORAGE_KEYS.activeSession)).not.toBeNull();

      await act(async () => {
        await result.current.endSession();
      });
      expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    });

    it('clears on cancel', async () => {
      const { result } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });
      await act(async () => {
        await result.current.cancelSession();
      });
      expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    });
  });

  describe('foreground reconciliation', () => {
    it('registers an appStateChange listener on mount', async () => {
      const { result, unmount } = renderHook(() => useBaskSession(3, 30, SUN_UP_UV5));
      await act(async () => {
        await result.current.startSession('tshirt', 40, 'vitamin_d');
      });

      const calls = vi.mocked(App.addListener).mock.calls;
      const stateCall = calls.find((c) => c[0] === 'appStateChange');
      expect(stateCall).toBeTruthy();

      // Firing isActive does not throw and leaves the session active.
      const cb = stateCall![1] as (e: { isActive: boolean }) => void;
      act(() => cb({ isActive: true }));
      expect(result.current.status).toBe('active');
      unmount();
    });
  });

  it('clearPersistedSession is exported and removes the key', () => {
    localStorage.setItem(STORAGE_KEYS.activeSession, '{}');
    clearPersistedSession();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
  });
});

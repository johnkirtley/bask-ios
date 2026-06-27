'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

// useLayoutEffect warns during SSR (static export build); fall back to useEffect
// there. On the client it runs after hydration commit but before paint, which is
// what makes the session restore both hydration-safe and flash-free.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { sessionsRepository } from '../lib/database';
import { leaderboardService } from '../lib/supabase/leaderboardService';
import { capture, ANALYTICS_EVENTS } from '../lib/analytics';
import { recordReviewValueEvent } from '../lib/services/inAppReviewService';
import { vitaminDRatePerMinute, calculateTimeToBurn, getExposurePercent, formatSunburnCountdown } from '../lib/dEngine';
import { integrateAccrual } from '../lib/sessionAccrual';
import {
  loadPersistedSession,
  savePersistedSession,
  clearPersistedSession,
} from '../lib/sessionPersistence';
import { BaskLiveActivity } from '../lib/plugins';
import { getSolarPhase, isSunUp } from '../lib/lightPhase';
import { lightPhaseForLiveActivity, formatElapsedTime } from '../lib/sessionPhaseUtils';
import type { SolarClock } from '../lib/lightPhase';
import type { LiveActivityPhase } from '../lib/plugins';
import type { BaskSessionStatus } from '../types';
import type { FitzpatrickType } from '../lib/dEngine';

export interface BaskSessionState {
  status: BaskSessionStatus;
  elapsedSeconds: number;
  startTime: Date | null;
  pausedAt: Date | null;
  uvIndex: number; // Effective UV captured at start (display/reference only)
  rawUvIndex: number; // Raw UV for display/Live Activity
  clothingPresetId: string;
  exposurePercent: number;
  fitzpatrickType: FitzpatrickType;
  age: number | null;
  currentIU: number; // Rounded accumulated IU (display)
  accumulatedIU: number; // Float IU accumulator (monotonic, integrated off live UV)
  lastAccrualMs: number; // Wall-clock of last accrual tick (for incremental dt)
  lastAccrualEffUv: number; // Effective UV at last accrual (conservative gap crediting)
  synthesizing: boolean; // Whether live effective UV is currently >= 3 (vitamin D phase)
  hasSynthesized: boolean; // Whether the session has ever produced vitamin D (morph latch)
  projectedTimeToBurn: number;
  sessionId: number | null;
  liveActivityId: string | null;
}

const INITIAL_STATE: BaskSessionState = {
  status: 'idle',
  elapsedSeconds: 0,
  startTime: null,
  pausedAt: null,
  uvIndex: 0,
  rawUvIndex: 0,
  clothingPresetId: '',
  exposurePercent: 0,
  fitzpatrickType: 2,
  age: null,
  currentIU: 0,
  accumulatedIU: 0,
  lastAccrualMs: 0,
  lastAccrualEffUv: 0,
  synthesizing: false,
  hasSynthesized: false,
  projectedTimeToBurn: 0,
  sessionId: null,
  liveActivityId: null,
};


interface SessionSunData extends SolarClock {
  rawUvIndex: number;
  effectiveUV: number;
}

/**
 * Hook for managing basking sessions with real-time timer and vitamin D calculation
 */
export function useBaskSession(
  fitzpatrickType: FitzpatrickType = 2,
  age: number | null = null,
  sunData: SessionSunData = { rawUvIndex: 0, effectiveUV: 0 },
  canAccessSunburnRisk = true,
) {
  // First render always uses INITIAL_STATE so it matches the statically-exported
  // HTML (no React hydration mismatch). A persisted in-progress session is
  // restored in a layout effect below, which re-renders synchronously before
  // paint, so there's no home-screen flash either.
  const [state, setState] = useState<BaskSessionState>(INITIAL_STATE);
  // Captured once: was this mount a restore of a previously-running session?
  const restoredRef = useRef(false);
  // True until the restored background gap has been credited at a live (>0) UV.
  // While true we hold off consuming the gap so a cold reload (which starts at
  // UV 0 before WeatherKit reloads) cannot under-credit it to zero.
  const restorePendingRef = useRef(false);
  const stateRef = useRef(state);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIURef = useRef(state.currentIU);
  const startTimeRef = useRef(state.startTime);
  const statusRef = useRef(state.status);
  const elapsedSecondsRef = useRef(state.elapsedSeconds);
  const sunDataRef = useRef(sunData);
  const canAccessSunburnRiskRef = useRef(canAccessSunburnRisk);
  const hasSynthesizedRef = useRef(state.hasSynthesized);

  useEffect(() => {
    sunDataRef.current = sunData;
  }, [
    sunData.rawUvIndex,
    sunData.effectiveUV,
    sunData.sunriseMs,
    sunData.sunsetMs,
    sunData.isDaylightFlag,
  ]);
  useEffect(() => {
    hasSynthesizedRef.current = state.hasSynthesized;
  }, [state.hasSynthesized]);
  useEffect(() => {
    canAccessSunburnRiskRef.current = canAccessSunburnRisk;
  }, [canAccessSunburnRisk]);

  // Keep refs in sync with state for use in interval callbacks
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { currentIURef.current = state.currentIU; }, [state.currentIU]);
  useEffect(() => { startTimeRef.current = state.startTime; }, [state.startTime]);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);
  useEffect(() => { elapsedSecondsRef.current = state.elapsedSeconds; }, [state.elapsedSeconds]);

  // Restore a persisted in-progress session AFTER hydration commits but BEFORE
  // the first paint (layout effect → synchronous re-render). Initial render
  // stays equal to INITIAL_STATE (matches the exported HTML → no hydration
  // warning) while still surfacing the active session immediately, and the
  // restore refs are set before the sibling passive mount effects (Live Activity
  // re-sync, persistence) observe them.
  useIsomorphicLayoutEffect(() => {
    const restored = loadPersistedSession();
    if (!restored) return;
    if (restored.status !== 'active' && restored.status !== 'paused') return;
    restoredRef.current = true;
    restorePendingRef.current = restored.status === 'active';
    stateRef.current = restored; // visible to passive mount effects pre-flush
    setState(restored);
  }, []);

  /**
   * Start a replacement Live Activity for a restored session and adopt its id.
   */
  const restartLiveActivity = useCallback(async (restored: BaskSessionState) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { supported } = await BaskLiveActivity.isSupported();
      if (!supported) return;
      const result = await BaskLiveActivity.startActivity({
        uvIndex: restored.rawUvIndex,
        timeToBurnMinutes: restored.projectedTimeToBurn,
        canAccessSunburnRisk: canAccessSunburnRiskRef.current,
        startTimeMs: restored.startTime?.getTime() ?? Date.now(),
        phase: lightPhaseForLiveActivity(restored.hasSynthesized, sunDataRef.current),
      });
      setState((prev) =>
        prev.status === 'idle' || prev.status === 'completed'
          ? prev
          : { ...prev, liveActivityId: result.activityId },
      );
    } catch (e) {
      console.error('Failed to restart Live Activity on restore:', e);
    }
  }, []);

  /**
   * On mount: either restore a reclaimed session's Live Activity, or clean up
   * orphaned activities on a normal cold start.
   *
   * When restoring, the Live Activity may have survived the process death
   * (ActivityKit activities outlive the app), so we re-sync it rather than
   * destroying it. If `updateActivity` rejects, the activity is gone and we
   * start a fresh one. On a non-restore mount we keep the original cleanup of
   * any truly-orphaned activities.
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (!restoredRef.current) {
      BaskLiveActivity.endAllActivities().catch(() => {});
      clearPersistedSession();
      return;
    }

    const restored = stateRef.current;
    if (!restored.liveActivityId) {
      // Restored a session whose Live Activity never started — start one now.
      void restartLiveActivity(restored);
      return;
    }

    BaskLiveActivity.updateActivity({
      activityId: restored.liveActivityId,
      currentIU: restored.currentIU,
      isPaused: restored.status === 'paused',
      canAccessSunburnRisk: canAccessSunburnRiskRef.current,
      effectiveStartTimeMs: restored.startTime?.getTime() ?? Date.now(),
      elapsedSecondsAtPause:
        restored.status === 'paused' ? restored.elapsedSeconds : 0,
      phase: lightPhaseForLiveActivity(restored.hasSynthesized, sunDataRef.current),
    }).catch(() => {
      // The activity died with the process — start a fresh one.
      void restartLiveActivity(restored);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Persist the in-progress session so it survives a process reclaim. Keyed on
   * durable transitions only (not the per-second timer) to avoid a write loop —
   * the integrator rebuilds elapsed/IU from `lastAccrualMs` on restore.
   */
  useEffect(() => {
    if (state.status === 'active' || state.status === 'paused') {
      savePersistedSession(state);
    } else {
      // Covers both 'idle' (cancel) and 'completed' (end).
      clearPersistedSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.status,
    state.sessionId,
    state.liveActivityId,
    state.hasSynthesized,
    state.pausedAt,
    state.startTime,
  ]);

  /**
   * Coarse periodic flush (every 15s while active) so `accumulatedIU` snapshots
   * mid-session — belt-and-suspenders on top of the transition-keyed persist.
   */
  useEffect(() => {
    if (state.status !== 'active') return;
    const id = setInterval(() => savePersistedSession(stateRef.current), 15_000);
    return () => clearInterval(id);
  }, [state.status]);

  /**
   * Start a new basking session
   */
  const startSession = useCallback(
    async (
      clothingPresetId: string,
      coveragePercent: number,
      startPhase: 'morning_light' | 'low_uv' | 'vitamin_d' = 'vitamin_d',
    ) => {
      // Fresh session has no background gap to hold for — clear any leftover
      // restore-pending flag from an earlier reclaimed session.
      restorePendingRef.current = false;

      const now = new Date();
      const exposurePercent = getExposurePercent(coveragePercent);

      const { rawUvIndex: rawUV, effectiveUV } = sunDataRef.current;

      // Zero UV is startable while the sun is up (time-only morning/evening
      // light session); only a genuinely set sun blocks the start.
      if (effectiveUV <= 0 && !isSunUp(Date.now(), sunDataRef.current)) {
        console.warn('Cannot start session: the sun is down');
        return;
      }

      // Is the session already synthesizing at the moment it starts? If so, it
      // began in the vitamin D phase and must never fire the morning-light "morph".
      const startsSynthesizing =
        vitaminDRatePerMinute(effectiveUV, exposurePercent, fitzpatrickType, age) > 0;

      try {
        // Create session in database (store raw UV for reference)
        const sessionId = await sessionsRepository.create({
          started_at: now.toISOString(),
          uv_index: rawUV,
          clothing_preset_id: clothingPresetId,
          exposure_percent: exposurePercent,
          duration_seconds: 0,
          iu_gained: 0,
        });

        // Start Live Activity (iOS 16.1+ only) - use raw UV for display
        let liveActivityId: string | null = null;
        if (Capacitor.isNativePlatform()) {
          try {
            const { supported } = await BaskLiveActivity.isSupported();
            if (supported) {
              const result = await BaskLiveActivity.startActivity({
                uvIndex: rawUV,
                timeToBurnMinutes: calculateTimeToBurn(rawUV, fitzpatrickType),
                canAccessSunburnRisk: canAccessSunburnRiskRef.current,
                startTimeMs: now.getTime(),
                phase: lightPhaseForLiveActivity(startsSynthesizing, sunDataRef.current),
              });
              liveActivityId = result.activityId;
            }
          } catch (e) {
            console.error('Failed to start Live Activity:', e);
          }
        }

        setState({
          status: 'active',
          elapsedSeconds: 0,
          startTime: now,
          pausedAt: null,
          uvIndex: effectiveUV, // Cloud-adjusted UV at start (reference only)
          rawUvIndex: rawUV, // Keep raw UV for reference
          clothingPresetId,
          exposurePercent,
          fitzpatrickType,
          age,
          currentIU: 0,
          accumulatedIU: 0,
          lastAccrualMs: now.getTime(),
          lastAccrualEffUv: effectiveUV,
          synthesizing: startsSynthesizing,
          hasSynthesized: startsSynthesizing,
          projectedTimeToBurn: calculateTimeToBurn(rawUV, fitzpatrickType), // Burn risk uses raw UV
          sessionId,
          liveActivityId,
        });

        capture(ANALYTICS_EVENTS.sessionStarted, {
          clothing_preset_id: clothingPresetId,
          exposure_percent: exposurePercent,
          uv_index: rawUV,
          phase_at_start: startPhase,
        });

        // Haptic feedback
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    },
    [fitzpatrickType, age]
  );

  /**
   * Timer effect - runs every second when session is active
   * Uses wall-clock time to prevent drift and handle backgrounding
   */
  useEffect(() => {
    if (state.status === 'active') {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          const liveUv = sunDataRef.current.effectiveUV;

          // After a restore, the background gap (prev.lastAccrualMs → now) must
          // be credited at a live UV, not the UV-0 of a freshly reloaded bundle.
          // Until live UV is available, only advance the displayed clock and
          // leave lastAccrualMs untouched so the gap survives to be credited
          // once. (At genuinely-zero UV no IU accrues anyway, so holding is safe.)
          if (restorePendingRef.current) {
            if (liveUv <= 0) {
              if (!prev.startTime) return prev;
              const elapsedSeconds = Math.floor(
                (Date.now() - prev.startTime.getTime()) / 1000,
              );
              return elapsedSeconds === prev.elapsedSeconds
                ? prev
                : { ...prev, elapsedSeconds };
            }
            restorePendingRef.current = false;
          }

          // Integrate IU off the *live* (cloud-adjusted) UV so a session morphs
          // from morning light into vitamin D the moment effective UV crosses 3.
          const next = integrateAccrual(prev, liveUv, Date.now());
          return next ? { ...prev, ...next } : prev;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [state.status]);

  /**
   * Periodic Live Activity update - every 15 seconds while active
   */
  useEffect(() => {
    if (state.status !== 'active' || !state.liveActivityId) return;
    if (!Capacitor.isNativePlatform()) return;

    const interval = setInterval(async () => {
      try {
        await BaskLiveActivity.updateActivity({
          activityId: state.liveActivityId!,
          currentIU: currentIURef.current,
          isPaused: false,
          canAccessSunburnRisk: canAccessSunburnRiskRef.current,
          effectiveStartTimeMs: startTimeRef.current?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: 0,
          phase: lightPhaseForLiveActivity(hasSynthesizedRef.current, sunDataRef.current),
        });
      } catch (e) {
        console.error('Failed to update Live Activity:', e);
      }
    }, 15_000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [state.status, state.liveActivityId]);

  /**
   * If a user unlocks Pro mid-session, update the Live Activity display without
   * touching the in-app session timer/state.
   */
  useEffect(() => {
    if (!state.liveActivityId) return;
    if (!Capacitor.isNativePlatform()) return;

    BaskLiveActivity.updateActivity({
      activityId: state.liveActivityId,
      currentIU: currentIURef.current,
      isPaused: statusRef.current === 'paused',
      canAccessSunburnRisk,
      effectiveStartTimeMs: startTimeRef.current?.getTime() ?? Date.now(),
      elapsedSecondsAtPause:
        statusRef.current === 'paused' ? elapsedSecondsRef.current : 0,
      phase: lightPhaseForLiveActivity(hasSynthesizedRef.current, sunDataRef.current),
    }).catch(e => console.error('Failed to update Live Activity access:', e));
  }, [canAccessSunburnRisk, state.liveActivityId]);

  /**
   * When the session first crosses into vitamin D, push an immediate Live Activity
   * update so the lock screen morphs in sync with the in-app celebration (rather
   * than waiting up to 15s for the next periodic tick).
   */
  useEffect(() => {
    if (!state.hasSynthesized || !state.liveActivityId) return;
    if (!Capacitor.isNativePlatform()) return;

    BaskLiveActivity.updateActivity({
      activityId: state.liveActivityId,
      currentIU: currentIURef.current,
      isPaused: statusRef.current === 'paused',
      canAccessSunburnRisk: canAccessSunburnRiskRef.current,
      effectiveStartTimeMs: startTimeRef.current?.getTime() ?? Date.now(),
      elapsedSecondsAtPause:
        statusRef.current === 'paused' ? elapsedSecondsRef.current : 0,
      phase: 'vitaminD',
    }).catch(e => console.error('Failed to push morph to Live Activity:', e));
  }, [state.hasSynthesized, state.liveActivityId]);

  /**
   * App state change listener - reconciles time when returning from background
   */
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            // App returned to foreground - force immediate reconciliation
            setState((prev) => {
              if (prev.status !== 'active' || !prev.startTime) return prev;

              // Reconcile the backgrounded interval with the same integrator (it
              // credits the gap conservatively at the lower of start/now UV).
              const next = integrateAccrual(prev, sunDataRef.current.effectiveUV, Date.now());
              if (!next) return prev;

              // Update Live Activity on foreground resume
              if (prev.liveActivityId && Capacitor.isNativePlatform()) {
                BaskLiveActivity.updateActivity({
                  activityId: prev.liveActivityId,
                  currentIU: next.currentIU ?? prev.currentIU,
                  isPaused: false,
                  canAccessSunburnRisk: canAccessSunburnRiskRef.current,
                  effectiveStartTimeMs: prev.startTime?.getTime() ?? Date.now(),
                  elapsedSecondsAtPause: 0,
                  phase: lightPhaseForLiveActivity(next.hasSynthesized, sunDataRef.current),
                }).catch(e => console.error('Failed to update Live Activity on foreground:', e));
              }

              return { ...prev, ...next };
            });
          }
        });
      } catch {
        // @capacitor/app not available (e.g., web fallback)
      }
    };

    setupListener();

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  /**
   * Pause the active session
   */
  const pauseSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const pauseTime = new Date();

    setState((prev) => {
      // Update Live Activity to paused state
      if (prev.liveActivityId && Capacitor.isNativePlatform()) {
        BaskLiveActivity.updateActivity({
          activityId: prev.liveActivityId,
          currentIU: prev.currentIU,
          isPaused: true,
          canAccessSunburnRisk: canAccessSunburnRiskRef.current,
          effectiveStartTimeMs: prev.startTime?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: prev.elapsedSeconds,
          phase: lightPhaseForLiveActivity(prev.hasSynthesized, sunDataRef.current),
        }).catch(e => console.error('Failed to update Live Activity on pause:', e));
      }

      capture(ANALYTICS_EVENTS.sessionPaused, {
        elapsed_seconds: prev.elapsedSeconds,
        current_iu: Math.round(prev.currentIU),
      });

      return {
        ...prev,
        status: 'paused',
        pausedAt: pauseTime,
      };
    });

    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  /**
   * Resume a paused session
   */
  const resumeSession = useCallback(async () => {
    // Resume resets the accrual clock below, so any held restore gap is moot.
    restorePendingRef.current = false;
    setState((prev) => {
      // Adjust startTime forward by the pause duration
      // so wall-clock calculations remain correct
      const pauseDuration = prev.pausedAt ? Date.now() - prev.pausedAt.getTime() : 0;
      const adjustedStartTime = prev.startTime
        ? new Date(prev.startTime.getTime() + pauseDuration)
        : prev.startTime;

      capture(ANALYTICS_EVENTS.sessionResumed, {
        pause_duration_seconds: Math.round(pauseDuration / 1000),
      });

      // Update Live Activity to resumed state
      if (prev.liveActivityId && Capacitor.isNativePlatform()) {
        BaskLiveActivity.updateActivity({
          activityId: prev.liveActivityId,
          currentIU: prev.currentIU,
          isPaused: false,
          canAccessSunburnRisk: canAccessSunburnRiskRef.current,
          effectiveStartTimeMs: adjustedStartTime?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: 0,
          phase: lightPhaseForLiveActivity(prev.hasSynthesized, sunDataRef.current),
        }).catch(e => console.error('Failed to update Live Activity on resume:', e));
      }

      return {
        ...prev,
        status: 'active',
        pausedAt: null,
        startTime: adjustedStartTime,
        // Reset the accrual clock so the paused interval is never credited.
        lastAccrualMs: Date.now(),
        lastAccrualEffUv: sunDataRef.current.effectiveUV,
      };
    });
    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  /**
   * End the session and save final values
   */
  const endSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Save final values to database
      if (state.sessionId) {
        await sessionsRepository.update(state.sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: state.elapsedSeconds,
          iu_gained: state.currentIU,
        });

        // Sync basking session to opt-in leaderboard (fire-and-forget, manual sessions only)
        leaderboardService
          .submitSession({
            localSessionId: state.sessionId,
            iuGained: state.currentIU,
            durationSeconds: state.elapsedSeconds,
          })
          .catch(() => {});

        try {
          await recordReviewValueEvent();
        } catch {
          // Review eligibility should never block session completion.
        }
      }

      // End Live Activity
      if (state.liveActivityId && Capacitor.isNativePlatform()) {
        try {
          await BaskLiveActivity.endActivity({
            activityId: state.liveActivityId,
            finalIU: state.currentIU,
          });
        } catch (e) {
          console.error('Failed to end Live Activity:', e);
        }
      }

      capture(ANALYTICS_EVENTS.sessionEnded, {
        duration_seconds: state.elapsedSeconds,
        iu_gained: Math.round(state.currentIU),
      });

      const completedSession = { ...state };

      setState({
        ...INITIAL_STATE,
        status: 'completed',
      });

      await Haptics.notification({ type: NotificationType.Success });

      return completedSession;
    } catch (error) {
      console.error('Failed to end session:', error);
      return null;
    }
  }, [state]);

  /**
   * Cancel the session without saving (discard)
   */
  const cancelSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      capture(ANALYTICS_EVENTS.sessionCancelled, {
        elapsed_seconds: state.elapsedSeconds,
        iu_gained: Math.round(state.currentIU),
      });

      if (state.sessionId) {
        await sessionsRepository.delete(state.sessionId);
      }

      // End Live Activity on cancel
      if (state.liveActivityId && Capacitor.isNativePlatform()) {
        try {
          await BaskLiveActivity.endActivity({
            activityId: state.liveActivityId,
            finalIU: 0,
          });
        } catch (e) {
          console.error('Failed to end Live Activity on cancel:', e);
        }
      }

      setState(INITIAL_STATE);
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }, [state.sessionId, state.liveActivityId]);

  const remainingSunburnSeconds = Math.max(
    0,
    state.projectedTimeToBurn * 60 - state.elapsedSeconds,
  );

  return {
    // State
    status: state.status,
    elapsedSeconds: state.elapsedSeconds,
    currentIU: state.currentIU,
    isSynthesizing: state.synthesizing, // live UV >= 3 (vitamin D phase)
    hasSynthesized: state.hasSynthesized, // session has crossed into vitamin D at least once
    projectedTimeToBurn: state.projectedTimeToBurn,
    remainingSunburnSeconds,
    formattedSunburnCountdown: formatSunburnCountdown(remainingSunburnSeconds),
    clothingPresetId: state.clothingPresetId,

    // Actions
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    cancelSession,

    // Helpers
    isActive: state.status === 'active',
    isPaused: state.status === 'paused',
    isIdle: state.status === 'idle',
    formattedTime: formatElapsedTime(state.elapsedSeconds),
  };
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { sessionsRepository } from '../lib/database';
import { leaderboardService } from '../lib/supabase/leaderboardService';
import { capture, ANALYTICS_EVENTS } from '../lib/analytics';
import { recordReviewValueEvent } from '../lib/services/inAppReviewService';
import { vitaminDRatePerMinute, calculateTimeToBurn, getExposurePercent, formatSunburnCountdown } from '../lib/dEngine';
import { integrateAccrual } from '../lib/sessionAccrual';
import { BaskLiveActivity } from '../lib/plugins';
import { getSolarPhase, isSunUp } from '../lib/lightPhase';
import type { SolarClock } from '../lib/lightPhase';
import type { LiveActivityPhase } from '../lib/plugins';
import type { BaskSessionStatus } from '../types';
import type { FitzpatrickType } from '../lib/dEngine';

interface BaskSessionState {
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

/**
 * Phase label for the lock screen / Dynamic Island. Pre-synthesis sessions are
 * only "morning light" when it's actually morning — computed sun-anchored at
 * each update so a session that outlives its window flips live, matching the
 * in-app hero label. "night" reads as evening light: a session can outlive
 * sunset by a few minutes.
 */
function lightPhaseForLiveActivity(
  hasSynthesized: boolean,
  solar: SolarClock,
): LiveActivityPhase {
  if (hasSynthesized) return 'vitaminD';
  const phase = getSolarPhase(Date.now(), solar);
  if (phase === 'morning') return 'morningLight';
  if (phase === 'evening' || phase === 'night') return 'eveningLight';
  return 'daylight';
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


/**
 * Format elapsed seconds as MM:SS
 */
function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
  const [state, setState] = useState<BaskSessionState>(INITIAL_STATE);
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
  useEffect(() => { currentIURef.current = state.currentIU; }, [state.currentIU]);
  useEffect(() => { startTimeRef.current = state.startTime; }, [state.startTime]);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);
  useEffect(() => { elapsedSecondsRef.current = state.elapsedSeconds; }, [state.elapsedSeconds]);

  /**
   * Clean up any orphaned Live Activities on mount
   */
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      BaskLiveActivity.endAllActivities().catch(() => {});
    }
  }, []);

  /**
   * Start a new basking session
   */
  const startSession = useCallback(
    async (
      clothingPresetId: string,
      coveragePercent: number,
      startPhase: 'morning_light' | 'low_uv' | 'vitamin_d' = 'vitamin_d',
    ) => {
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
          // Integrate IU off the *live* (cloud-adjusted) UV so a session morphs
          // from morning light into vitamin D the moment effective UV crosses 3.
          const next = integrateAccrual(prev, sunDataRef.current.effectiveUV, Date.now());
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

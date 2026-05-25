'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { sessionsRepository } from '../lib/database';
import { calculateVitaminD, calculateTimeToBurn, getExposurePercent, formatSunburnCountdown } from '../lib/dEngine';
import { BaskLiveActivity } from '../lib/plugins';
import type { BaskSessionStatus } from '../types';
import type { FitzpatrickType } from '../lib/dEngine';

interface BaskSessionState {
  status: BaskSessionStatus;
  elapsedSeconds: number;
  startTime: Date | null;
  pausedAt: Date | null;
  uvIndex: number; // Effective UV (cloud-adjusted)
  rawUvIndex: number; // Raw UV for display/Live Activity
  clothingPresetId: string;
  exposurePercent: number;
  fitzpatrickType: FitzpatrickType;
  age: number | null;
  currentIU: number;
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

interface SessionSunData {
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
) {
  const [state, setState] = useState<BaskSessionState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIURef = useRef(state.currentIU);
  const startTimeRef = useRef(state.startTime);
  const sunDataRef = useRef(sunData);

  useEffect(() => {
    sunDataRef.current = sunData;
  }, [sunData.rawUvIndex, sunData.effectiveUV]);

  // Keep refs in sync with state for use in interval callbacks
  useEffect(() => { currentIURef.current = state.currentIU; }, [state.currentIU]);
  useEffect(() => { startTimeRef.current = state.startTime; }, [state.startTime]);

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
    async (clothingPresetId: string, coveragePercent: number) => {
      const now = new Date();
      const exposurePercent = getExposurePercent(coveragePercent);

      const { rawUvIndex: rawUV, effectiveUV } = sunDataRef.current;

      if (effectiveUV <= 0) {
        console.warn('Cannot start session: UV too low for vitamin D synthesis');
        return;
      }

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
                startTimeMs: now.getTime(),
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
          uvIndex: effectiveUV, // Use cloud-adjusted UV for vitamin D calculations
          rawUvIndex: rawUV, // Keep raw UV for reference
          clothingPresetId,
          exposurePercent,
          fitzpatrickType,
          age,
          currentIU: 0,
          projectedTimeToBurn: calculateTimeToBurn(rawUV, fitzpatrickType), // Burn risk uses raw UV
          sessionId,
          liveActivityId,
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
          if (!prev.startTime) return prev;

          // Calculate elapsed time from wall-clock (not cumulative increments)
          const now = Date.now();
          const totalElapsedMs = now - prev.startTime.getTime();
          const newElapsed = Math.floor(totalElapsedMs / 1000);
          const minutes = newElapsed / 60;

          // Recalculate vitamin D IU
          const newIU = calculateVitaminD(
            prev.uvIndex,
            minutes,
            prev.exposurePercent,
            prev.fitzpatrickType,
            prev.age
          );

          return {
            ...prev,
            elapsedSeconds: newElapsed,
            currentIU: newIU,
          };
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
          effectiveStartTimeMs: startTimeRef.current?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: 0,
        });
      } catch (e) {
        console.error('Failed to update Live Activity:', e);
      }
    }, 15_000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [state.status, state.liveActivityId]);

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

              const now = Date.now();
              const totalElapsedMs = now - prev.startTime.getTime();
              const newElapsed = Math.floor(totalElapsedMs / 1000);
              const minutes = newElapsed / 60;

              const newIU = calculateVitaminD(
                prev.uvIndex,
                minutes,
                prev.exposurePercent,
                prev.fitzpatrickType,
                prev.age
              );

              // Update Live Activity on foreground resume
              if (prev.liveActivityId && Capacitor.isNativePlatform()) {
                BaskLiveActivity.updateActivity({
                  activityId: prev.liveActivityId,
                  currentIU: newIU,
                  isPaused: false,
                  effectiveStartTimeMs: prev.startTime?.getTime() ?? Date.now(),
                  elapsedSecondsAtPause: 0,
                }).catch(e => console.error('Failed to update Live Activity on foreground:', e));
              }

              return {
                ...prev,
                elapsedSeconds: newElapsed,
                currentIU: newIU,
              };
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
          effectiveStartTimeMs: prev.startTime?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: prev.elapsedSeconds,
        }).catch(e => console.error('Failed to update Live Activity on pause:', e));
      }

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

      // Update Live Activity to resumed state
      if (prev.liveActivityId && Capacitor.isNativePlatform()) {
        BaskLiveActivity.updateActivity({
          activityId: prev.liveActivityId,
          currentIU: prev.currentIU,
          isPaused: false,
          effectiveStartTimeMs: adjustedStartTime?.getTime() ?? Date.now(),
          elapsedSecondsAtPause: 0,
        }).catch(e => console.error('Failed to update Live Activity on resume:', e));
      }

      return {
        ...prev,
        status: 'active',
        pausedAt: null,
        startTime: adjustedStartTime,
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
      }

      // Auto-sync vitamin D to Apple Health
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && state.currentIU > 0) {
        try {
          const { BaskHealth } = await import('../lib/plugins/baskHealth');
          await BaskHealth.writeDietaryVitaminD({
            dosageIU: state.currentIU,
            date: new Date().toISOString(),
          });
        } catch (error) {
          console.warn('Failed to sync vitamin D to HealthKit:', error);
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

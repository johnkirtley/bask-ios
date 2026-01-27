'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { sessionsRepository } from '../lib/database';
import { calculateVitaminD, calculateTimeToBurn, getExposurePercent } from '../lib/dEngine';
import { useSunData } from './useSunData';
import type { BaskSessionStatus } from '../types';
import type { FitzpatrickType } from '../lib/dEngine';

interface BaskSessionState {
  status: BaskSessionStatus;
  elapsedSeconds: number;
  startTime: Date | null;
  pausedAt: Date | null;
  uvIndex: number;
  clothingPresetId: string;
  exposurePercent: number;
  fitzpatrickType: FitzpatrickType;
  currentIU: number;
  projectedTimeToBurn: number;
  sessionId: number | null;
}

const INITIAL_STATE: BaskSessionState = {
  status: 'idle',
  elapsedSeconds: 0,
  startTime: null,
  pausedAt: null,
  uvIndex: 0,
  clothingPresetId: '',
  exposurePercent: 0,
  fitzpatrickType: 2,
  currentIU: 0,
  projectedTimeToBurn: 0,
  sessionId: null,
};

/**
 * Format elapsed seconds as MM:SS
 */
function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Hook for managing basking sessions with real-time timer and vitamin D calculation
 */
export function useBaskSession(fitzpatrickType: FitzpatrickType = 2) {
  const [state, setState] = useState<BaskSessionState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sunData = useSunData();

  /**
   * Start a new basking session
   */
  const startSession = useCallback(
    async (clothingPresetId: string, coveragePercent: number) => {
      const now = new Date();
      const exposurePercent = getExposurePercent(coveragePercent);

      try {
        // Create session in database
        const sessionId = await sessionsRepository.create({
          started_at: now.toISOString(),
          uv_index: sunData.uvIndex,
          clothing_preset_id: clothingPresetId,
          exposure_percent: exposurePercent,
          duration_seconds: 0,
          iu_gained: 0,
        });

        setState({
          status: 'active',
          elapsedSeconds: 0,
          startTime: now,
          pausedAt: null,
          uvIndex: sunData.uvIndex,
          clothingPresetId,
          exposurePercent,
          fitzpatrickType,
          currentIU: 0,
          projectedTimeToBurn: calculateTimeToBurn(sunData.uvIndex, fitzpatrickType),
          sessionId,
        });

        // Haptic feedback
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    },
    [sunData.uvIndex, fitzpatrickType]
  );

  /**
   * Timer effect - runs every second when session is active
   */
  useEffect(() => {
    if (state.status === 'active') {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          const newElapsed = prev.elapsedSeconds + 1;
          const minutes = newElapsed / 60;

          // Recalculate vitamin D IU
          const newIU = calculateVitaminD(
            prev.uvIndex,
            minutes,
            prev.exposurePercent,
            prev.fitzpatrickType
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
   * Pause the active session
   */
  const pauseSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState((prev) => ({
      ...prev,
      status: 'paused',
      pausedAt: new Date(),
    }));
    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  /**
   * Resume a paused session
   */
  const resumeSession = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'active',
      pausedAt: null,
    }));
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

      setState(INITIAL_STATE);
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }, [state.sessionId]);

  return {
    // State
    status: state.status,
    elapsedSeconds: state.elapsedSeconds,
    currentIU: state.currentIU,
    projectedTimeToBurn: state.projectedTimeToBurn,
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

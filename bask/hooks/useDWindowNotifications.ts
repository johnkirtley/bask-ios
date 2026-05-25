'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { DWindowForecast } from '../lib/dWindowForecast';
import { GoalStreakSummary } from '../lib/database';
import { notificationService } from '../lib/services/notificationService';

/**
 * Hook that reconciles D-window notifications when forecast or eligibility changes.
 * Dedupe lives in notificationService so Home remounts do not re-trigger scheduling.
 */
export function useDWindowNotifications(
  forecast: DWindowForecast | null,
  isPremium: boolean,
  streakSummary?: GoalStreakSummary | null,
) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    notificationService
      .reconcileDWindowNotifications({
        forecast,
        isPremium,
        streakContext: streakSummary
          ? {
              currentStreak: streakSummary.currentStreak,
              hitToday: streakSummary.hitToday,
            }
          : null,
      })
      .catch(console.warn);
  }, [forecast, isPremium, streakSummary]);
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { BaskHealth } from '../lib/plugins/baskHealth';
import { sessionsRepository } from '../lib/database/repositories/sessionsRepository';
import { isHealthKitSyncEnabled } from '../lib/healthKitSettings';
import { calculateVitaminD } from '../lib/dEngine';
import { formatLocalDateKey } from '../lib/dateUtils';

interface HealthKitSyncState {
  isEnabled: boolean;
  lastSyncAt: string | null;
  syncCount: number;
  passiveDaylightMinutes: number;
  passiveIU: number;
  isSyncing: boolean;
  error: string | null;
}

const MAX_DAYLIGHT_MINUTES = 480; // 8 hours sanity cap
const MAX_PASSIVE_IU = 20000; // Sanity cap for estimated IU
const MIN_PASSIVE_IU = 100; // Minimum IU for a passive card to be worth showing (mirrors MIN_VIABLE_IU in dWindowForecast.ts)

/**
 * Hook to sync HealthKit timeInDaylight data with Bask sessions
 * Runs on app foreground and periodically syncs passive daylight to avoid double-counting
 */
export function useHealthKitSync(userProfile?: {
  fitzpatrickType: number;
  age?: number | null;
}) {
  // Extract primitive values to stabilize useCallback dependencies
  const fitzpatrickType = userProfile?.fitzpatrickType;
  const age = userProfile?.age;

  const [state, setState] = useState<HealthKitSyncState>({
    isEnabled: false,
    lastSyncAt: null,
    syncCount: 0,
    passiveDaylightMinutes: 0,
    passiveIU: 0,
    isSyncing: false,
    error: null,
  });

  // Check if HealthKit sync is enabled
  useEffect(() => {
    async function checkEnabled() {
      const enabled = await isHealthKitSyncEnabled();
      setState((prev) => ({ ...prev, isEnabled: enabled }));
    }

    checkEnabled();
  }, []);

  const lastUvRef = useRef<number | undefined>(undefined);

  // Sync HealthKit data
  const syncHealthKitData = useCallback(
    async (averageUV?: number) => {
      if (!state.isEnabled || !fitzpatrickType) {
        return;
      }

      if (averageUV !== undefined) {
        lastUvRef.current = averageUV;
      }
      const uvForCalculation = averageUV ?? lastUvRef.current;
      if (uvForCalculation === undefined) {
        return;
      }

      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        return;
      }

      setState((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        // Get today's date range (local timezone)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Use start of next day to capture the full day (inclusive of 23:59:59.999)
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Fetch HealthKit time in daylight for today
        // Note: This will fail gracefully on iOS < 17 with an error from the native plugin
        const healthKitData = await BaskHealth.getTimeInDaylight({
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        });

        let daylightMinutes = healthKitData.minutes;

        // Validate and clamp data
        if (!isFinite(daylightMinutes) || daylightMinutes < 0) {
          daylightMinutes = 0;
        }
        daylightMinutes = Math.min(daylightMinutes, MAX_DAYLIGHT_MINUTES);

        // If no daylight time, delete the HealthKit session row
        const dateStr = formatLocalDateKey(startOfDay);
        if (daylightMinutes === 0) {
          await sessionsRepository.deleteHealthKitSession(dateStr);
          setState((prev) => ({
            ...prev,
            passiveDaylightMinutes: 0,
            passiveIU: 0,
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
            syncCount: prev.syncCount + 1,
          }));
          return;
        }

        // Get manual session duration for today to avoid double-counting
        const manualSessionSeconds = await sessionsRepository.getManualSessionDuration(dateStr);
        const manualSessionMinutes = Math.floor(manualSessionSeconds / 60);

        // Subtract manual session time from HealthKit daylight
        // Note: This assumes manual outdoor sessions are included in HealthKit's timeInDaylight.
        // Edge case: Manual indoor sessions (e.g., UV lamp) would incorrectly reduce passive daylight,
        // but this is an acceptable tradeoff for simplicity.
        const passiveDaylightMinutes = Math.max(0, daylightMinutes - manualSessionMinutes);

        // Estimate IU from passive daylight using representative daily UV (from caller)
        const estimatedUV = uvForCalculation;
        let estimatedIU = calculateVitaminD(
          estimatedUV,
          passiveDaylightMinutes,
          50, // Assume 50% exposure for passive outdoor time (e.g., clothed)
          fitzpatrickType as 1 | 2 | 3 | 4 | 5 | 6,
          age
        );

        // Clamp estimated IU to sanity limits
        estimatedIU = Math.min(estimatedIU, MAX_PASSIVE_IU);

        // If the residual passive daylight is negligible (e.g. a manual session
        // absorbed ~all of the watch's daylight), don't surface an empty/near-zero
        // card. Delete any stale row from a prior sync and stop here.
        if (passiveDaylightMinutes <= 0 || estimatedIU < MIN_PASSIVE_IU) {
          await sessionsRepository.deleteHealthKitSession(dateStr);
          setState((prev) => ({
            ...prev,
            passiveDaylightMinutes: 0,
            passiveIU: 0,
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
            syncCount: prev.syncCount + 1,
            error: null,
          }));
          return;
        }

        // Upsert the HealthKit session for the meaningful residual daylight
        await sessionsRepository.upsertHealthKitSession({
          date: dateStr,
          duration_seconds: passiveDaylightMinutes * 60,
          iu_gained: Math.round(estimatedIU),
          uv_index: estimatedUV,
          synced_at: new Date().toISOString(),
        });

        setState((prev) => ({
          ...prev,
          passiveDaylightMinutes,
          passiveIU: Math.round(estimatedIU),
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
          syncCount: prev.syncCount + 1,
          error: null,
        }));
      } catch (error: any) {
        console.error('Failed to sync HealthKit data:', error);

        // If the error indicates no data available, treat as deletion (user removed all entries)
        const errorMsg = error?.message || error?.errorMessage || '';
        if (errorMsg.includes('No data available')) {
          const dateStr = formatLocalDateKey(new Date());
          await sessionsRepository.deleteHealthKitSession(dateStr);
          setState((prev) => ({
            ...prev,
            passiveDaylightMinutes: 0,
            passiveIU: 0,
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
            syncCount: prev.syncCount + 1,
            error: null,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          isSyncing: false,
          error: error?.message || 'Failed to sync HealthKit data',
        }));
      }
    },
    [state.isEnabled, fitzpatrickType, age]
  );

  // Sync on app foreground
  useEffect(() => {
    if (!state.isEnabled) return;

    let cleanup: (() => void) | undefined;

    async function setupListener() {
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          syncHealthKitData(lastUvRef.current);
        }
      });
      cleanup = () => listener.remove();
    }

    setupListener();

    return () => {
      if (cleanup) cleanup();
    };
  }, [state.isEnabled, syncHealthKitData]);

  return {
    ...state,
    sync: syncHealthKitData,
  };
}

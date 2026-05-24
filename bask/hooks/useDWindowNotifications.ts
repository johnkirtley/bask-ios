'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { DWindowForecast } from '../lib/dWindowForecast';
import { notificationService } from '../lib/services/notificationService';

/**
 * Hook that schedules D-window notifications when forecast changes
 */
export function useDWindowNotifications(forecast: DWindowForecast | null) {
  const lastForecastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !forecast) return;

    // Create a simple hash to detect forecast changes
    const forecastHash = JSON.stringify({
      today: forecast.today?.startTime,
      tomorrow: forecast.tomorrow?.startTime,
    });

    // Only reschedule if forecast actually changed
    if (forecastHash === lastForecastRef.current) return;
    lastForecastRef.current = forecastHash;

    // Schedule notifications
    notificationService.scheduleDWindowNotifications(forecast).catch(console.warn);

  }, [forecast]);
}

'use client';

import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night';

/**
 * Determine the time of day based on current hour
 * Morning: 6am-11am
 * Midday: 11am-4pm
 * Evening: 4pm-8pm
 * Night: 8pm-6am
 */
export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 16) {
    return 'midday';
  }
  if (hour >= 16 && hour < 20) {
    return 'evening';
  }
  return 'night';
}

/**
 * Hook that returns the current time of day
 * Updates every minute to keep synchronized
 */
export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const now = new Date();
    return getTimeOfDayFromHour(now.getHours());
  });

  useEffect(() => {
    // Update immediately
    const updateTimeOfDay = () => {
      const now = new Date();
      setTimeOfDay(getTimeOfDayFromHour(now.getHours()));
    };

    updateTimeOfDay();

    // Update every minute
    const interval = setInterval(updateTimeOfDay, 60000);

    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}

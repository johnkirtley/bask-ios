'use client';

import { useState, useEffect } from 'react';
import { generateMockSunData, SunData } from '../lib/mockData';

/**
 * Hook that provides sun/UV data
 * Updates every 5 minutes to stay current
 */
export function useSunData(): SunData {
  const [sunData, setSunData] = useState<SunData>(() => generateMockSunData());

  useEffect(() => {
    // Update immediately
    setSunData(generateMockSunData());

    // Update every 5 minutes
    const interval = setInterval(() => {
      setSunData(generateMockSunData());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return sunData;
}

'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { generateMockSunData, SunData, getUVLevel, UVDataPoint } from '../lib/mockData';
import { BaskWeather } from '../lib/plugins';

/**
 * Hook that provides sun/UV data
 * On native iOS 16+: Uses WeatherKit API for real data
 * On web or fallback: Uses mock data
 * Updates every 5 minutes to stay current
 */
export function useSunData(): SunData {
  const [sunData, setSunData] = useState<SunData>(() => generateMockSunData());

  useEffect(() => {
    const fetchSunData = async () => {
      // Check if we're running on a native platform
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        // Web fallback: use mock data
        setSunData(generateMockSunData());
        return;
      }

      try {
        // Request all data in parallel
        const [currentWeather, hourlyForecast, solarEvents] = await Promise.all([
          BaskWeather.getCurrentWeather(),
          BaskWeather.getHourlyForecast(),
          BaskWeather.getSolarEvents(),
        ]);

        // Map WeatherKit data to SunData interface
        const uvIndex = currentWeather.uvIndex;
        const uvLevel = getUVLevel(uvIndex);

        // Calculate time to burn based on UV index
        // Assuming skin type 2 (fair skin) - 67 minutes at UV 1
        const baseTimeToBurn = 67;
        const timeToBurnMinutes = Math.round(baseTimeToBurn / Math.max(1, uvIndex));

        // Build UV curve from hourly forecast
        const uvCurve: UVDataPoint[] = hourlyForecast.forecast.map((item) => ({
          hour: item.hour,
          uvIndex: item.uvIndex,
          sunAngle: calculateSunAngle(item.hour), // Approximate sun angle
        }));

        // Find peak UV hours for "sweet spot"
        const peakUVHours = uvCurve
          .filter((item) => item.uvIndex >= 3) // Moderate or higher
          .sort((a, b) => b.uvIndex - a.uvIndex);

        const sweetSpotStart = peakUVHours.length > 0 ? peakUVHours[peakUVHours.length - 1].hour : 10;
        const sweetSpotEnd = peakUVHours.length > 0 ? peakUVHours[0].hour : 14;

        // Calculate vitamin D progress (simplified)
        // Peak progress during high UV hours
        const currentHour = new Date().getHours();
        const isInSweetSpot = currentHour >= sweetSpotStart && currentHour <= sweetSpotEnd;
        const vitaminDProgress = isInSweetSpot
          ? Math.min(80, 20 + (currentHour - sweetSpotStart) * 15)
          : Math.max(0, 40 - Math.abs(currentHour - 12) * 5);

        const newSunData: SunData = {
          uvIndex,
          uvLevel,
          timeToBurnMinutes,
          maxSunTimeMinutes: 120, // 2 hours max recommended
          vitaminDProgress,
          vitaminDGoal: 5000, // IU
          vitaminDCurrent: Math.round((vitaminDProgress / 100) * 5000),
          sunriseTime: solarEvents.sunriseFormatted || '6:32 AM',
          sunsetTime: solarEvents.sunsetFormatted || '7:45 PM',
          sweetSpotStart,
          sweetSpotEnd,
          uvCurve,
        };

        setSunData(newSunData);
      } catch (error) {
        // Fall back to mock data on error
        console.warn('Failed to fetch WeatherKit data, using mock data:', error);
        setSunData(generateMockSunData());
      }
    };

    // Fetch immediately
    fetchSunData();

    // Update every 5 minutes
    const interval = setInterval(() => {
      fetchSunData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return sunData;
}

/**
 * Calculate approximate sun angle based on hour of day
 * Simplified calculation - actual sun angle depends on latitude, date, etc.
 */
function calculateSunAngle(hour: number): number {
  // Sun angle peaks at solar noon (assumed to be 12pm)
  const hoursFromNoon = Math.abs(hour - 12);
  const maxAngle = 60; // degrees at noon
  const angle = Math.max(0, maxAngle - hoursFromNoon * 8);
  return Math.round(angle);
}

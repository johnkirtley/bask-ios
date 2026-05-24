'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { generateMockSunData, SunData, getUVLevel, UVDataPoint } from '../lib/sunDataUtils';
import { BaskWeather } from '../lib/plugins';
import { userProfileRepository } from '../lib/database/repositories/userProfileRepository';
import { calculateTimeToBurn, FitzpatrickType } from '../lib/dEngine';
import { resolveDailyGoal, resolveFitzpatrickType } from '../lib/profileUtils';

/**
 * Creates an empty sun data object for when real data is unavailable
 */
function createEmptySunData(): SunData {
  return {
    uvIndex: 0,
    uvLevel: 'Low',
    timeToBurnMinutes: 0,
    maxSunTimeMinutes: 0,
    vitaminDProgress: 0,
    vitaminDGoal: 5000, // Default - user can edit
    vitaminDCurrent: 0,
    sunriseTime: '--',
    sunsetTime: '--',
    sweetSpotStart: 0,
    sweetSpotEnd: 0,
    hasOptimalWindow: false,
    uvCurve: [],
    cloudCover: 0,
  };
}

/**
 * Hook that provides sun/UV data
 * On native iOS 16+: Uses WeatherKit API for real data
 * On web: Uses mock data for demonstration
 * On native error: Shows empty state
 * Updates every 5 minutes to stay current
 */
export function useSunData(): SunData & { isLive: boolean; locationDenied: boolean; isLoading: boolean; locationCity?: string; locationState?: string; refreshGoal: () => void } {
  const [sunData, setSunData] = useState<SunData>(() => createEmptySunData());
  const [isLive, setIsLive] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locationCity, setLocationCity] = useState<string | undefined>(undefined);
  const [locationState, setLocationState] = useState<string | undefined>(undefined);
  const [userGoal, setUserGoal] = useState<number>(5000); // Default, will be fetched from DB
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);

  // Function to manually trigger goal refresh
  const refreshGoal = () => {
    setGoalRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout;

    const fetchSunData = async () => {
      let currentGoal = userGoal;
      let fitzpatrickType: FitzpatrickType = 2;
      try {
        const userProfile = await userProfileRepository.get();
        currentGoal = resolveDailyGoal(userProfile);
        setUserGoal(currentGoal);
        fitzpatrickType = resolveFitzpatrickType(userProfile, null);
      } catch (error) {
        console.warn('Failed to fetch user profile, using defaults:', error);
      }
      // Check if we're running on a native platform
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        // Web only: use mock data for demonstration
        const mockData = generateMockSunData();
        mockData.vitaminDGoal = currentGoal;
        mockData.vitaminDCurrent = Math.round((mockData.vitaminDProgress / 100) * currentGoal);
        mockData.timeToBurnMinutes = calculateTimeToBurn(mockData.uvIndex, fitzpatrickType);
        setSunData(mockData);
        setIsLive(false);
        setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }

      try {
        // Request all data in parallel
        const [currentWeather, hourlyForecast, solarEvents, locationInfo] = await Promise.all([
          BaskWeather.getCurrentWeather(),
          BaskWeather.getHourlyForecast(),
          BaskWeather.getSolarEvents(),
          BaskWeather.getLocationInfo(),
        ]);

        // Map WeatherKit data to SunData interface
        const uvIndex = currentWeather.uvIndex;
        const uvLevel = getUVLevel(uvIndex);
        const timeToBurnMinutes = calculateTimeToBurn(uvIndex, fitzpatrickType);

        // Build UV curve from hourly forecast
        const uvCurve: UVDataPoint[] = hourlyForecast.forecast.map((item) => ({
          hour: item.hour,
          uvIndex: item.uvIndex,
          sunAngle: calculateSunAngle(item.hour), // Approximate sun angle
        }));

        // Find peak UV hours for "sweet spot"
        const peakUVHours = uvCurve
          .filter((item) => item.uvIndex >= 3) // Moderate or higher
          .sort((a, b) => a.hour - b.hour); // Sort by hour (ascending) to get correct start/end

        const hasOptimalWindow = peakUVHours.length > 0;
        const sweetSpotStart = hasOptimalWindow ? peakUVHours[0].hour : 10;
        const sweetSpotEnd = hasOptimalWindow ? peakUVHours[peakUVHours.length - 1].hour : 14;

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
          maxSunTimeMinutes: 120, // Suggested sun exposure time
          vitaminDProgress,
          vitaminDGoal: currentGoal,
          vitaminDCurrent: Math.round((vitaminDProgress / 100) * currentGoal),
          sunriseTime: solarEvents.sunriseFormatted || '--',
          sunsetTime: solarEvents.sunsetFormatted || '--',
          sweetSpotStart,
          sweetSpotEnd,
          hasOptimalWindow,
          uvCurve,
          cloudCover: currentWeather.cloudCover,
        };

        setSunData(newSunData);
        setIsLive(true);
        setLocationDenied(false); // Clear denial if permission was re-granted
        setLocationCity(locationInfo.city);
        setLocationState(locationInfo.state);
        setIsLoading(false);
        clearTimeout(safetyTimeout);
      } catch (error) {
        // Show empty state on native error
        console.warn('Failed to fetch WeatherKit data:', error);

        // Detect location permission denial from native plugin
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isDenied = errorMessage.includes('Location permission not granted');
        setLocationDenied(isDenied);

        setSunData(createEmptySunData());
        setIsLive(false);
        setIsLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    // Fetch immediately
    fetchSunData();

    // Safety timeout: if data hasn't loaded in 10 seconds, force loading to false
    safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    // Update every 5 minutes
    const interval = setInterval(() => {
      fetchSunData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, [goalRefreshTrigger]);

  return { ...sunData, isLive, locationDenied, isLoading, locationCity, locationState, refreshGoal };
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

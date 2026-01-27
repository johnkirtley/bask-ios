import { HourlyForecastItem } from './plugins/baskWeather';

/**
 * Optimal basking window for a specific time period
 */
export interface OptimalWindow {
  date: string; // ISO8601 date
  dayLabel: string; // "Today" or "Tomorrow"
  startTime: string; // "12:15 PM"
  endTime: string; // "12:40 PM"
  durationMinutes: number;
  avgUvIndex: number;
  estimatedIU: number; // Estimated vitamin D for this window
  reason: string; // Why this is the optimal window
  cloudCover: number; // Average cloud cover %
}

/**
 * D-Window Forecast result
 */
export interface DWindowForecast {
  today: OptimalWindow | null;
  tomorrow: OptimalWindow | null;
  efficiency: 'excellent' | 'good' | 'moderate' | 'poor';
  recommendations: string[];
}

/**
 * Calculate optimal basking windows for next 48 hours
 * This is the "D-Window Forecast" MOAT feature
 */
export function calculateOptimalWindows(
  hourlyForecast: HourlyForecastItem[],
  fitzpatrickType: number,
  exposurePercent: number = 50,
  targetIU: number = 2500
): DWindowForecast {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Separate today's and tomorrow's forecasts
  const todayForecast = hourlyForecast.filter((h) => {
    const date = new Date(h.date);
    return date >= todayStart && date < tomorrowStart && date > now;
  });

  const tomorrowForecast = hourlyForecast.filter((h) => {
    const date = new Date(h.date);
    return date >= tomorrowStart && date < tomorrowEnd;
  });

  const todayWindow = findOptimalWindow(todayForecast, 'Today', fitzpatrickType, exposurePercent, targetIU);
  const tomorrowWindow = findOptimalWindow(
    tomorrowForecast,
    'Tomorrow',
    fitzpatrickType,
    exposurePercent,
    targetIU
  );

  // Calculate overall efficiency
  const bestUV = Math.max(todayWindow?.avgUvIndex || 0, tomorrowWindow?.avgUvIndex || 0);
  let efficiency: 'excellent' | 'good' | 'moderate' | 'poor';
  if (bestUV >= 5) efficiency = 'excellent';
  else if (bestUV >= 3) efficiency = 'good';
  else if (bestUV >= 2) efficiency = 'moderate';
  else efficiency = 'poor';

  // Generate recommendations
  const recommendations = generateRecommendations(todayWindow, tomorrowWindow, efficiency, targetIU);

  return {
    today: todayWindow,
    tomorrow: tomorrowWindow,
    efficiency,
    recommendations,
  };
}

/**
 * Find the best basking window in a set of hourly forecasts
 */
function findOptimalWindow(
  forecast: HourlyForecastItem[],
  dayLabel: string,
  fitzpatrickType: number,
  exposurePercent: number,
  targetIU: number
): OptimalWindow | null {
  if (forecast.length === 0) return null;

  // Filter for reasonable basking hours (UV >= 2, between 8 AM and 6 PM)
  const usableHours = forecast.filter((h) => h.uvIndex >= 2 && h.hour >= 8 && h.hour <= 18);

  if (usableHours.length === 0) return null;

  // Score each hour based on UV index, cloud cover, and time of day
  const scoredHours = usableHours.map((h) => {
    // Higher UV is better (up to a point)
    const uvScore = Math.min(h.uvIndex / 8, 1) * 10;

    // Lower cloud cover is better
    const cloudScore = (1 - h.cloudCover) * 5;

    // Prefer midday hours (10 AM - 2 PM)
    const timeScore = h.hour >= 10 && h.hour <= 14 ? 3 : 0;

    const totalScore = uvScore + cloudScore + timeScore;

    return { hour: h, score: totalScore };
  });

  // Sort by score descending
  scoredHours.sort((a, b) => b.score - a.score);

  // Find the best contiguous window (1-3 hours)
  let bestWindow: { start: HourlyForecastItem; hours: HourlyForecastItem[]; avgUV: number } | null = null;
  let bestScore = 0;

  for (let i = 0; i < scoredHours.length; i++) {
    const startHour = scoredHours[i].hour;
    const window: HourlyForecastItem[] = [startHour];
    let windowScore = scoredHours[i].score;

    // Try to extend window to adjacent hours
    for (let j = i + 1; j < Math.min(i + 3, scoredHours.length); j++) {
      const nextHour = scoredHours[j].hour;
      if (nextHour.hour === window[window.length - 1].hour + 1) {
        window.push(nextHour);
        windowScore += scoredHours[j].score;
      }
    }

    const avgUV = window.reduce((sum, h) => sum + h.uvIndex, 0) / window.length;

    if (windowScore > bestScore) {
      bestScore = windowScore;
      bestWindow = { start: startHour, hours: window, avgUV };
    }
  }

  if (!bestWindow) return null;

  // Calculate duration needed to reach target IU
  const avgCloudCover = bestWindow.hours.reduce((sum, h) => sum + h.cloudCover, 0) / bestWindow.hours.length;
  const effectiveUV = bestWindow.avgUV * (1 - avgCloudCover * 0.7);

  const minutesToTarget = calculateMinutesToIU(targetIU, effectiveUV, exposurePercent, fitzpatrickType);

  // Cap at 60 minutes for safety
  const durationMinutes = Math.min(minutesToTarget, 60);

  // Format times
  const startHour = bestWindow.start.hour;
  const endHour = startHour + Math.floor(durationMinutes / 60);
  const endMinute = durationMinutes % 60;

  const startTime = formatTime(startHour, 0);
  const endTime = formatTime(endHour, endMinute);

  // Calculate estimated IU for this window
  const estimatedIU = Math.round(
    calculateIUForDuration(durationMinutes, effectiveUV, exposurePercent, fitzpatrickType)
  );

  // Generate reason
  let reason = `UV ${bestWindow.avgUV.toFixed(1)}`;
  if (avgCloudCover < 0.2) {
    reason += ', clear skies';
  } else if (avgCloudCover < 0.5) {
    reason += ', partly cloudy';
  } else {
    reason += ', cloudy';
  }

  return {
    date: bestWindow.start.date,
    dayLabel,
    startTime,
    endTime,
    durationMinutes,
    avgUvIndex: bestWindow.avgUV,
    estimatedIU,
    reason,
    cloudCover: avgCloudCover,
  };
}

/**
 * Calculate minutes needed to reach target IU
 */
function calculateMinutesToIU(
  targetIU: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: number
): number {
  // Holick formula approximation: IU = UVI × duration (min) × BSA (%) × skin_multiplier
  const skinMultiplier = getSkinMultiplier(fitzpatrickType);
  const minutesNeeded = targetIU / (uvIndex * (exposurePercent / 100) * skinMultiplier);
  return Math.max(5, Math.round(minutesNeeded));
}

/**
 * Calculate IU for a given duration
 */
function calculateIUForDuration(
  minutes: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: number
): number {
  const skinMultiplier = getSkinMultiplier(fitzpatrickType);
  return uvIndex * minutes * (exposurePercent / 100) * skinMultiplier;
}

/**
 * Get skin type multiplier for D synthesis
 */
function getSkinMultiplier(type: number): number {
  switch (type) {
    case 1:
      return 10; // Very fair - synthesizes fastest
    case 2:
      return 8;
    case 3:
      return 6;
    case 4:
      return 4;
    case 5:
      return 2;
    case 6:
      return 1; // Dark - synthesizes slowest
    default:
      return 6;
  }
}

/**
 * Format hour and minute to 12-hour time string
 */
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  today: OptimalWindow | null,
  tomorrow: OptimalWindow | null,
  efficiency: string,
  targetIU: number
): string[] {
  const recommendations: string[] = [];

  if (today && today.avgUvIndex >= 5) {
    recommendations.push(
      `Perfect sun right now! ${today.durationMinutes} min outside will give you ${today.estimatedIU} IU.`
    );
  } else if (today && today.avgUvIndex >= 3) {
    recommendations.push(`Good UV today from ${today.startTime}. Plan a ${today.durationMinutes}-min outdoor break.`);
  } else if (today) {
    recommendations.push(
      `Low UV today (${today.avgUvIndex.toFixed(1)}). You'll need ${today.durationMinutes} min or consider a supplement.`
    );
  } else {
    recommendations.push(`No usable UV today. Consider a ${Math.round(targetIU / 40)} IU supplement tonight.`);
  }

  if (tomorrow && tomorrow.avgUvIndex >= 5) {
    recommendations.push(
      `Tomorrow looks excellent! Best window: ${tomorrow.startTime}–${tomorrow.endTime} (UV ${tomorrow.avgUvIndex.toFixed(1)}).`
    );
  } else if (tomorrow && tomorrow.avgUvIndex >= 3) {
    recommendations.push(`Tomorrow: ${tomorrow.startTime}–${tomorrow.endTime} for ${tomorrow.estimatedIU} IU.`);
  }

  if (efficiency === 'poor') {
    recommendations.push('UV is weak this week. Increase supplement dose or plan longer outdoor sessions.');
  }

  return recommendations;
}

import { HourlyForecastItem } from './plugins/baskWeather';
import { DEFAULT_DAILY_GOAL_IU } from './constants';
import {
  SKIN_MULTIPLIERS,
  FitzpatrickType,
  calculateTimeToBurn,
  getAgeMultiplier,
  BASE_IU_PER_MINUTE,
  effectiveUv,
  formatEstimatedIU,
} from './dEngine';

/**
 * Minimum estimated IU for a window to be considered viable.
 * Below this threshold, the UV conditions (after cloud attenuation)
 * cannot produce meaningful vitamin D -- don't recommend the window.
 */
const MIN_VIABLE_IU = 100;
const MIN_RECOMMENDED_SESSION_MINUTES = 5;
const SAME_DAY_RECOMMENDATION_LEAD_MINUTES = 5;
const SAME_DAY_RECOMMENDATION_ROUNDING_MINUTES = 5;

/**
 * Full-day band when effective UV supports vitamin D synthesis (Shadow Rule).
 * Wider than the scored optimal session block.
 */
export interface SynthesisWindow {
  date: string; // ISO8601 date
  dayLabel: string; // "Today" or "Tomorrow"
  startTime: string; // "10:00 AM"
  endTime: string; // "4:00 PM"
  startsAt: Date;
  endsAt: Date;
}

/**
 * Optimal basking window for a specific time period
 */
export interface OptimalWindow {
  date: string; // ISO8601 date
  dayLabel: string; // "Today" or "Tomorrow"
  windowStartTime: string; // "11:00 AM" - actionable start of best scored session block
  windowEndTime: string; // "2:00 PM" - end of best scored session block
  startTime: string; // "12:15 PM" - recommended session start
  endTime: string; // "12:40 PM" - recommended session end
  durationMinutes: number; // recommended session duration
  avgUvIndex: number; // raw UV (for display)
  effectiveUvIndex: number; // cloud-adjusted UV (for synthesis-quality decisions)
  estimatedIU: number; // Estimated vitamin D for this window
  reason: string; // Why this is the optimal window
  cloudCover: number; // Average cloud cover %
}

/**
 * Recommendation types
 */
export type RecommendationType = 'action' | 'alert' | 'tip' | 'window';

/**
 * Structured recommendation content
 */
export interface RecommendationItem {
  headline: string; // Bold, scannable text
  details?: string; // Optional secondary text (muted)
  items?: string[]; // Optional bullet sub-items
}

/**
 * Single recommendation with type and priority
 */
export interface Recommendation {
  type: RecommendationType;
  priority: number; // Sort order (0 = highest)
  content: RecommendationItem;
}

/**
 * D-Window Forecast result
 */
export interface DWindowForecast {
  today: OptimalWindow | null;
  tomorrow: OptimalWindow | null;
  todaySynthesis: SynthesisWindow | null;
  tomorrowSynthesis: SynthesisWindow | null;
  /**
   * Raw-UV daylight band on days where clouds blocked synthesis.
   * Only populated when the day's noWindowReason is 'clouds-blocking',
   * so it is mutually exclusive with today/tomorrow windows and synthesis.
   * Used to schedule a softer "step outside anyway" notification.
   */
  todayCloudBlocked: SynthesisWindow | null;
  tomorrowCloudBlocked: SynthesisWindow | null;
  efficiency: 'excellent' | 'good' | 'moderate' | 'poor';
  recommendations: Recommendation[];
  noWindowReason?: 'uv-too-low' | 'clouds-blocking' | 'low-exposure';
  todayNoWindowReason?: 'uv-too-low' | 'clouds-blocking' | 'low-exposure';
  tomorrowNoWindowReason?: 'uv-too-low' | 'clouds-blocking' | 'low-exposure';
}

/**
 * Determine why no D-window exists for a given forecast period
 */
function determineNoWindowReason(
  forecast: HourlyForecastItem[],
): 'uv-too-low' | 'clouds-blocking' | 'low-exposure' | undefined {
  if (forecast.length === 0) return undefined;

  // Check if there were any hours with raw UV >= 3
  const hoursWithRawUV = forecast.filter(
    (h) => h.uvIndex >= 3 && h.hour >= 8 && h.hour <= 18,
  );

  if (hoursWithRawUV.length > 0) {
    // Raw UV was sufficient, but need to determine if clouds or low exposure is the blocker
    // Calculate effective UV (after cloud attenuation) for hours with raw UV >= 3
    const hoursWithEffectiveUV = hoursWithRawUV.filter(
      (h) => effectiveUv(h.uvIndex, h.cloudCover) >= 3,
    );

    if (hoursWithEffectiveUV.length > 0) {
      // Effective UV is sufficient, so the blocker is low exposure/skin factors
      return 'low-exposure';
    } else {
      // Effective UV is blocked by clouds
      return 'clouds-blocking';
    }
  } else {
    // Raw UV itself is below threshold
    return 'uv-too-low';
  }
}

/**
 * Calculate optimal basking windows for next 48 hours
 * This is the "D-Window Forecast" MOAT feature
 */
export function calculateOptimalWindows(
  hourlyForecast: HourlyForecastItem[],
  fitzpatrickType: number,
  exposurePercent: number = 50,
  targetIU: number = DEFAULT_DAILY_GOAL_IU,
  age: number | null = null,
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
    return date >= todayStart && date < tomorrowStart;
  });

  const tomorrowForecast = hourlyForecast.filter((h) => {
    const date = new Date(h.date);
    return date >= tomorrowStart && date < tomorrowEnd;
  });

  const todayWindow = findOptimalWindow(
    todayForecast,
    'Today',
    fitzpatrickType,
    exposurePercent,
    targetIU,
    age,
    now,
  );
  const tomorrowWindow = findOptimalWindow(
    tomorrowForecast,
    'Tomorrow',
    fitzpatrickType,
    exposurePercent,
    targetIU,
    age,
    now,
  );

  const todaySynthesis = findSynthesisWindow(todayForecast, 'Today');
  const tomorrowSynthesis = findSynthesisWindow(tomorrowForecast, 'Tomorrow');

  // Null out today's windows if they have already fully passed
  let effectiveTodayWindow = todayWindow;
  if (todayWindow) {
    const endHour = parseWindowEndHour(todayWindow.windowEndTime);
    const windowEnd = new Date(todayStart);
    windowEnd.setHours(endHour, 0, 0, 0);
    if (now > windowEnd) {
      effectiveTodayWindow = null;
    }
  }

  let effectiveTodaySynthesis = todaySynthesis;
  if (todaySynthesis && now > todaySynthesis.endsAt) {
    effectiveTodaySynthesis = null;
  }

  // Calculate max forecasted UV across next 48 hours (for circadian rhythm advice)
  const allForecast = [...todayForecast, ...tomorrowForecast];
  const maxForecastedUV =
    allForecast.length > 0 ? Math.max(...allForecast.map((h) => h.uvIndex)) : 0;

  // Determine why no windows exist (for contextual UI messaging)
  // Compute reason for today and tomorrow separately
  const todayNoWindowReason = !effectiveTodayWindow
    ? determineNoWindowReason(todayForecast)
    : undefined;
  const tomorrowNoWindowReason = !tomorrowWindow
    ? determineNoWindowReason(tomorrowForecast)
    : undefined;

  // For backwards compatibility, use today's reason, or fall back to tomorrow's if both are null
  const noWindowReason = todayNoWindowReason || tomorrowNoWindowReason;

  // Calculate overall efficiency
  const bestUV = Math.max(
    effectiveTodayWindow?.effectiveUvIndex || 0,
    tomorrowWindow?.effectiveUvIndex || 0,
  );
  let efficiency: 'excellent' | 'good' | 'moderate' | 'poor';
  if (bestUV >= 5) efficiency = 'excellent';
  else if (bestUV >= 3) efficiency = 'good';
  else if (bestUV >= 2) efficiency = 'moderate';
  else efficiency = 'poor';

  // Generate recommendations
  const recommendations = generateRecommendations(
    effectiveTodayWindow,
    tomorrowWindow,
    efficiency,
    targetIU,
    noWindowReason,
    maxForecastedUV,
    now,
    todayNoWindowReason,
  );

  // Cloud-blocked daylight bands — only when clouds (not low UV / exposure)
  // are the blocker, so these never coexist with a window or synthesis band.
  let todayCloudBlocked =
    todayNoWindowReason === 'clouds-blocking'
      ? findCloudBlockedBand(todayForecast, 'Today')
      : null;
  if (todayCloudBlocked && now > todayCloudBlocked.endsAt) {
    todayCloudBlocked = null;
  }
  const tomorrowCloudBlocked =
    tomorrowNoWindowReason === 'clouds-blocking'
      ? findCloudBlockedBand(tomorrowForecast, 'Tomorrow')
      : null;

  return {
    today: effectiveTodayWindow,
    tomorrow: tomorrowWindow,
    todaySynthesis: effectiveTodaySynthesis,
    tomorrowSynthesis,
    todayCloudBlocked,
    tomorrowCloudBlocked,
    efficiency,
    recommendations,
    noWindowReason,
    todayNoWindowReason,
    tomorrowNoWindowReason,
  };
}

/**
 * Find when vitamin D synthesis is possible (effective UV >= 3, 8 AM–6 PM).
 */
function findSynthesisWindow(
  forecast: HourlyForecastItem[],
  dayLabel: string,
): SynthesisWindow | null {
  const viableHours = forecast
    .filter(
      (h) =>
        h.hour >= 8 &&
        h.hour <= 18 &&
        effectiveUv(h.uvIndex, h.cloudCover) >= 3,
    )
    .sort((a, b) => a.hour - b.hour);

  if (viableHours.length === 0) return null;

  const first = viableHours[0];
  const last = viableHours[viableHours.length - 1];
  const startHour = first.hour;
  const endHour = last.hour + 1;

  const startsAt = buildDateFromHour(first.date, startHour, 0);
  const endsAt = buildDateFromHour(last.date, endHour, 0);

  return {
    date: first.date,
    dayLabel,
    startTime: formatTime(startHour, 0),
    endTime: formatTime(endHour, 0),
    startsAt,
    endsAt,
  };
}

/**
 * Find the raw-UV daylight band (UV >= 3, 8 AM–6 PM) ignoring cloud cover.
 * These are hours that would have supported synthesis if not for clouds —
 * used to time a softer "step outside anyway" nudge on cloud-blocked days.
 */
function findCloudBlockedBand(
  forecast: HourlyForecastItem[],
  dayLabel: string,
): SynthesisWindow | null {
  const viableHours = forecast
    .filter((h) => h.hour >= 8 && h.hour <= 18 && h.uvIndex >= 3)
    .sort((a, b) => a.hour - b.hour);

  if (viableHours.length === 0) return null;

  const first = viableHours[0];
  const last = viableHours[viableHours.length - 1];
  const startHour = first.hour;
  const endHour = last.hour + 1;

  const startsAt = buildDateFromHour(first.date, startHour, 0);
  const endsAt = buildDateFromHour(last.date, endHour, 0);

  return {
    date: first.date,
    dayLabel,
    startTime: formatTime(startHour, 0),
    endTime: formatTime(endHour, 0),
    startsAt,
    endsAt,
  };
}

function buildDateFromHour(
  isoDate: string,
  hour: number,
  minute: number,
): Date {
  const date = new Date(isoDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function roundedSameDayRecommendationStart(now: Date): Date {
  const earliest = new Date(
    now.getTime() + SAME_DAY_RECOMMENDATION_LEAD_MINUTES * 60_000,
  );
  const intervalMs = SAME_DAY_RECOMMENDATION_ROUNDING_MINUTES * 60_000;
  return new Date(Math.ceil(earliest.getTime() / intervalMs) * intervalMs);
}

function formatDateTime(date: Date): string {
  return formatTime(date.getHours(), date.getMinutes());
}

/**
 * Live countdown label when approaching today's synthesis window.
 */
export function getSynthesisCountdown(
  synthesis: SynthesisWindow | null,
  now: Date = new Date(),
): { minutesUntil: number; label: string } | null {
  if (!synthesis || now >= synthesis.startsAt) return null;

  const minutesUntil = Math.max(
    1,
    Math.ceil((synthesis.startsAt.getTime() - now.getTime()) / 60000),
  );

  if (minutesUntil > 120) return null;

  return {
    minutesUntil,
    label: `D synthesis starts in ${minutesUntil} min`,
  };
}

/** Whether the current time is inside the synthesis band. */
export function isInSynthesisWindow(
  synthesis: SynthesisWindow | null,
  now: Date = new Date(),
): boolean {
  if (!synthesis) return false;
  return now >= synthesis.startsAt && now <= synthesis.endsAt;
}

/**
 * Secondary synthesis copy for the forecast card (null = hide row).
 */
export function getSynthesisSecondaryMessage(
  synthesis: SynthesisWindow | null,
  optimal: OptimalWindow | null,
  now: Date = new Date(),
): string | null {
  if (!synthesis) return null;

  const countdown = getSynthesisCountdown(synthesis, now);
  if (countdown) return countdown.label;

  const inSynthesis = isInSynthesisWindow(synthesis, now);

  if (inSynthesis && optimal) {
    const optimalStart = parseTimeToDate(optimal.windowStartTime);
    if (now < optimalStart) {
      return `You can get vitamin D now · Best window at ${optimal.windowStartTime}`;
    }
    return null;
  }

  if (inSynthesis && !optimal) {
    return `D synthesis active until ${synthesis.endTime}`;
  }

  if (!inSynthesis && now < synthesis.startsAt) {
    if (optimal && synthesis.startTime === optimal.windowStartTime) {
      return null;
    }
    return `Earliest D synthesis: ${synthesis.startTime}`;
  }

  return null;
}

/** Subtext for StatMetrics time-to-goal when UV is low or goal is far. */
export function getSynthesisStatSubtext(
  synthesis: SynthesisWindow | null,
  optimal: OptimalWindow | null,
  now: Date = new Date(),
): string | null {
  if (!synthesis) return null;

  const countdown = getSynthesisCountdown(synthesis, now);
  if (countdown) return countdown.label;

  if (isInSynthesisWindow(synthesis, now)) {
    return `Window open until ${synthesis.endTime}`;
  }

  if (now < synthesis.startsAt) {
    return `Earliest D synthesis: ${synthesis.startTime}`;
  }

  if (optimal) return null;

  return null;
}

function parseTimeToDate(timeStr: string): Date {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;

  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return date;
}

/**
 * Find the best basking window in a set of hourly forecasts
 */
function findOptimalWindow(
  forecast: HourlyForecastItem[],
  dayLabel: string,
  fitzpatrickType: number,
  exposurePercent: number,
  targetIU: number,
  age: number | null,
  now: Date = new Date(),
): OptimalWindow | null {
  if (forecast.length === 0) return null;

  const sameDayStart =
    dayLabel === 'Today' ? roundedSameDayRecommendationStart(now) : null;

  // Filter for reasonable basking hours (UV >= 3 for D synthesis, between 8 AM and 6 PM)
  let usableHours = forecast.filter(
    (h) => h.uvIndex >= 3 && h.hour >= 8 && h.hour <= 18,
  );

  // For today, exclude hours that cannot support a near-future recommendation.
  if (sameDayStart) {
    usableHours = usableHours.filter((h) => {
      const hourEnd = buildDateFromHour(h.date, h.hour + 1, 0);
      return hourEnd > sameDayStart;
    });
  }

  if (usableHours.length === 0) return null;

  // Sort chronologically for contiguous window detection
  const chronological = [...usableHours].sort((a, b) => a.hour - b.hour);

  // Find the best contiguous 1–3 hour window (by score)
  let bestWindow: {
    start: HourlyForecastItem;
    hours: HourlyForecastItem[];
    avgUV: number;
  } | null = null;
  let bestScore = 0;

  const scoreHour = (h: HourlyForecastItem) => {
    const uvScore = Math.min(h.uvIndex / 8, 1) * 10;
    const cloudScore = (1 - h.cloudCover) * 5;
    return uvScore + cloudScore;
  };

  for (let i = 0; i < chronological.length; i++) {
    for (let len = 1; len <= 3 && i + len <= chronological.length; len++) {
      const window = chronological.slice(i, i + len);

      // Require true chronological adjacency (e.g. 10, 11, 12 — not 10, 14)
      let contiguous = true;
      for (let k = 1; k < window.length; k++) {
        if (window[k].hour !== window[k - 1].hour + 1) {
          contiguous = false;
          break;
        }
      }
      if (!contiguous) continue;

      if (sameDayStart) {
        const windowStart = buildDateFromHour(
          window[0].date,
          window[0].hour,
          0,
        );
        const windowEnd = buildDateFromHour(
          window[window.length - 1].date,
          window[window.length - 1].hour + 1,
          0,
        );
        const recommendedStart =
          sameDayStart > windowStart ? sameDayStart : windowStart;
        const availableMinutes = Math.floor(
          (windowEnd.getTime() - recommendedStart.getTime()) / 60_000,
        );
        if (availableMinutes < MIN_RECOMMENDED_SESSION_MINUTES) continue;
      }

      const windowScore = window.reduce((sum, h) => sum + scoreHour(h), 0);
      const avgUV =
        window.reduce((sum, h) => sum + h.uvIndex, 0) / window.length;

      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestWindow = { start: window[0], hours: window, avgUV };
      }
    }
  }

  if (!bestWindow) return null;

  // Calculate duration needed to reach target IU
  const avgCloudCover =
    bestWindow.hours.reduce((sum, h) => sum + h.cloudCover, 0) /
    bestWindow.hours.length;
  // Cloud cover approximation: (1 - cloudCover * 0.7) is a rough heuristic
  // Thin clouds vs. storm clouds differ, but this is acceptable for estimation
  const effectiveUV = effectiveUv(bestWindow.avgUV, avgCloudCover);

  const minutesToFullGoal = calculateMinutesToIU(
    targetIU,
    effectiveUV,
    exposurePercent,
    fitzpatrickType,
    age,
  );
  const timeToBurn = calculateTimeToBurn(
    effectiveUV,
    fitzpatrickType as FitzpatrickType,
  );

  // Recommend one burn-safe session (or less if the goal is already within reach)
  const durationMinutes = Math.max(
    MIN_RECOMMENDED_SESSION_MINUTES,
    Math.min(
      isFinite(minutesToFullGoal) ? minutesToFullGoal : timeToBurn,
      timeToBurn,
      60,
    ),
  );

  // Calculate full UV-viable opportunity window (the multi-hour range)
  const windowStartHour = bestWindow.start.hour;
  const windowEndHour = bestWindow.hours[bestWindow.hours.length - 1].hour + 1; // +1 because we want the end of the last hour
  const windowStartAt = buildDateFromHour(
    bestWindow.start.date,
    windowStartHour,
    0,
  );
  const windowEndAt = buildDateFromHour(
    bestWindow.hours[bestWindow.hours.length - 1].date,
    windowEndHour,
    0,
  );
  const recommendedStartAt =
    sameDayStart && sameDayStart > windowStartAt ? sameDayStart : windowStartAt;
  const availableMinutes = Math.floor(
    (windowEndAt.getTime() - recommendedStartAt.getTime()) / 60_000,
  );
  if (availableMinutes < MIN_RECOMMENDED_SESSION_MINUTES) return null;

  const windowStartTime = formatDateTime(recommendedStartAt);
  const windowEndTime = formatTime(windowEndHour, 0);

  // Calculate recommended session times (within the opportunity window)
  const adjustedDurationMinutes = Math.min(durationMinutes, availableMinutes);
  const endAt = new Date(
    recommendedStartAt.getTime() + adjustedDurationMinutes * 60_000,
  );

  const startTime = windowStartTime;
  const endTime = formatDateTime(endAt);

  // Calculate estimated IU for this window
  const estimatedIU = Math.round(
    calculateIUForDuration(
      adjustedDurationMinutes,
      effectiveUV,
      exposurePercent,
      fitzpatrickType,
      age,
    ),
  );

  // Reject window if effective conditions can't produce meaningful vitamin D
  if (estimatedIU < MIN_VIABLE_IU) {
    return null;
  }

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
    windowStartTime,
    windowEndTime,
    startTime,
    endTime,
    durationMinutes: adjustedDurationMinutes,
    avgUvIndex: bestWindow.avgUV,
    effectiveUvIndex: effectiveUV,
    estimatedIU,
    reason,
    cloudCover: avgCloudCover,
  };
}

/**
 * Uncapped minutes needed to reach target IU (aligned with dEngine.calculateTimeToGoal)
 */
function calculateMinutesToIU(
  targetIU: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: number,
  age: number | null,
): number {
  if (uvIndex < 3 || exposurePercent <= 0 || targetIU <= 0) return Infinity;

  const skinMultiplier =
    SKIN_MULTIPLIERS[fitzpatrickType as FitzpatrickType] ?? 3.0;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age);

  const ratePerMinute =
    uvFactor *
    exposureFraction *
    (1 / skinMultiplier) *
    ageFactor *
    BASE_IU_PER_MINUTE;
  if (ratePerMinute <= 0) return Infinity;

  return Math.ceil(targetIU / ratePerMinute);
}

/**
 * Calculate IU for a given duration
 * Uses the same formula as dEngine for consistency
 * Caps synthesis at the burn threshold (biological saturation)
 */
function calculateIUForDuration(
  minutes: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: number,
  age: number | null,
): number {
  // Shadow Rule: UV must be >= 3 for vitamin D synthesis
  if (uvIndex < 3) return 0;

  const skinMultiplier =
    SKIN_MULTIPLIERS[fitzpatrickType as FitzpatrickType] ?? 3.0;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age);

  // Cap synthesis at the burn threshold (biological saturation)
  const timeToBurn = calculateTimeToBurn(
    uvIndex,
    fitzpatrickType as FitzpatrickType,
  );
  const effectiveMinutes = Math.min(minutes, timeToBurn);

  // Formula aligned with dEngine: IU = (UVI/10) * Minutes * Exposure% * (1/SkinMultiplier) * AgeFactor * BaseRate
  return (
    uvFactor *
    effectiveMinutes *
    exposureFraction *
    (1 / skinMultiplier) *
    ageFactor *
    BASE_IU_PER_MINUTE
  );
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
 * Parse a time string like "2:00 PM" back into 24-hour format (14)
 */
function parseWindowEndHour(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  let [hours] = time.split(':').map(Number);

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours;
}

function isNowInOpportunityWindow(window: OptimalWindow, now: Date): boolean {
  const start = parseTimeToDate(window.windowStartTime);
  const end = parseTimeToDate(window.windowEndTime);
  return now >= start && now <= end;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  today: OptimalWindow | null,
  tomorrow: OptimalWindow | null,
  efficiency: string,
  targetIU: number,
  noWindowReason?: 'uv-too-low' | 'clouds-blocking' | 'low-exposure',
  maxForecastedUV?: number,
  now: Date = new Date(),
  todayNoWindowReason?: 'uv-too-low' | 'clouds-blocking' | 'low-exposure',
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const isLowUvScenario =
    (maxForecastedUV !== undefined && maxForecastedUV < 3) ||
    noWindowReason === 'clouds-blocking';

  // Today's recommendation — gate on cloud-adjusted UV so "perfect sun" reflects real synthesis
  if (
    today &&
    today.effectiveUvIndex >= 5 &&
    isNowInOpportunityWindow(today, now)
  ) {
    recommendations.push({
      type: 'window',
      priority: 1,
      content: {
        headline: 'Perfect sun right now!',
        details: `About ${
          today.durationMinutes
        } min in the sun, an estimated ~${formatEstimatedIU(
          today.estimatedIU,
        )} IU.`,
      },
    });
  } else if (today && today.effectiveUvIndex >= 3) {
    recommendations.push({
      type: 'window',
      priority: 2,
      content: {
        headline: `Good UV today from ${today.startTime}`,
        details: `Plan a ${today.durationMinutes}-min outdoor break.`,
      },
    });
  } else if (today) {
    recommendations.push({
      type: 'tip',
      priority: 3,
      content: {
        headline: `Low UV today (${today.avgUvIndex.toFixed(1)})`,
        details: `You'll need ${today.durationMinutes} min. Some people also consider supplementation. Ask your provider.`,
      },
    });
  }

  // Tomorrow's recommendation — gate on cloud-adjusted UV, display raw UV
  if (tomorrow && tomorrow.effectiveUvIndex >= 5) {
    recommendations.push({
      type: 'window',
      priority: 4,
      content: {
        headline: 'Tomorrow looks excellent!',
        details: `Best window: ${tomorrow.startTime}–${
          tomorrow.endTime
        } (UV ${tomorrow.avgUvIndex.toFixed(1)}).`,
      },
    });
  } else if (tomorrow && tomorrow.effectiveUvIndex >= 3) {
    recommendations.push({
      type: 'window',
      priority: 5,
      content: {
        headline: `Tomorrow: ${tomorrow.startTime}–${tomorrow.endTime}`,
        details: `An estimated ~${formatEstimatedIU(
          tomorrow.estimatedIU,
        )} IU available.`,
      },
    });
  }

  // Low-exposure guidance — UV is available but current exposure setup limits yield
  if (!today && todayNoWindowReason === 'low-exposure') {
    recommendations.push({
      type: 'action',
      priority: 1,
      content: {
        headline: 'More skin exposure could make today viable',
        items: [
          'Try a lighter clothing preset if accurate',
          'Use the forecast window for a short outdoor break if comfortable',
        ],
        details:
          'UV is available, but your current exposure estimate is too low for a meaningful D-window.',
      },
    });
  }

  // Efficiency warning — skip when the low-UV action card already covers it,
  // and skip when exposure (not UV) is the limiter: 'poor' efficiency is then
  // just an artifact of windows being null, and the exposure action covers it.
  const isExposureLimited =
    todayNoWindowReason === 'low-exposure' || noWindowReason === 'low-exposure';
  if (efficiency === 'poor' && !isLowUvScenario && !isExposureLimited) {
    recommendations.push({
      type: 'alert',
      priority: 4,
      content: {
        headline: 'UV is weak this week',
        details: 'Natural vitamin D production will be limited.',
      },
    });
  }

  // Actionable guidance for consistently low UV or cloud-blocked conditions
  if (isLowUvScenario) {
    recommendations.push({
      type: 'action',
      priority: 0,
      content: {
        headline: 'UV too weak for vitamin D synthesis',
        items: [
          'Consider discussing vitamin D and cofactor supplementation with a clinician',
          'Morning light exposure can support circadian rhythm during low-UV periods',
        ],
      },
    });
  }

  return recommendations;
}

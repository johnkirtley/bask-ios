import type { DWindowForecast } from './dWindowForecast';

export interface NoWindowCopy {
  headline: string;
  subtext: string;
}

/**
 * Determine the user-facing copy when there is no D-window today.
 * Extracted from DWindowForecastCard so the messaging logic is unit-testable.
 *
 * The isCurrentCloudBlocked flag is the key BASKAPP-26 fix: when true, the user
 * is experiencing cloud blocking *right now*; when false, the forecast suggests
 * clouds may limit the window *later today* — the copy must distinguish these.
 */
export function getTodayNoWindowCopy(
  reason: DWindowForecast['todayNoWindowReason'],
  isAfterSunset: boolean,
  isCurrentCloudBlocked: boolean,
): NoWindowCopy {
  if (isAfterSunset) {
    return {
      headline: 'Sun has set',
      subtext: 'No D-window is available for the rest of today.',
    };
  }

  if (reason === 'clouds-blocking') {
    return {
      headline: 'No window right now',
      subtext: isCurrentCloudBlocked
        ? 'Clouds may be blocking vitamin D right now. Check back later.'
        : 'Clouds may limit your D-window later today. Check back later.',
    };
  }

  if (reason === 'low-exposure') {
    return {
      headline: 'No window right now',
      subtext: 'Conditions aren\'t enough for your D-window right now. Check back later.',
    };
  }

  if (reason === 'uv-too-low') {
    return {
      headline: 'No window right now',
      subtext: 'UV is too low for vitamin D right now. Check back later.',
    };
  }

  return {
    headline: 'No window right now',
    subtext: 'Forecast still updating. Check back later.',
  };
}

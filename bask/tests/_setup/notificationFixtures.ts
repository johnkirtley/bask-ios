/**
 * Forecast fixtures for notification tests. Windows are dated "tomorrow" so
 * notification times are always in the future regardless of when the test runs
 * (the service skips notifications within a 60s grace of `now`).
 */
import type {
  DWindowForecast,
  OptimalWindow,
  SynthesisWindow,
} from '@/lib/dWindowForecast';

function tomorrowAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function makeSynthesis(opts: Partial<SynthesisWindow> = {}): SynthesisWindow {
  const start = tomorrowAt(12);
  const end = tomorrowAt(14);
  return {
    date: start.toISOString(),
    dayLabel: 'Tomorrow',
    startTime: '12:00 PM',
    endTime: '2:00 PM',
    startsAt: start,
    endsAt: end,
    ...opts,
  };
}

export function makeOptimalWindow(opts: Partial<OptimalWindow> = {}): OptimalWindow {
  return {
    date: tomorrowAt(12).toISOString(),
    dayLabel: 'Tomorrow',
    windowStartTime: '11:30 AM',
    windowEndTime: '1:30 PM',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    durationMinutes: 20,
    avgUvIndex: 6,
    effectiveUvIndex: 5,
    estimatedIU: 800,
    reason: 'peak UV',
    cloudCover: 10,
    ...opts,
  };
}

export function makeForecast(opts: Partial<DWindowForecast> = {}): DWindowForecast {
  return {
    today: null,
    tomorrow: makeOptimalWindow(),
    todaySynthesis: null,
    tomorrowSynthesis: makeSynthesis(),
    todayCloudBlocked: null,
    tomorrowCloudBlocked: null,
    efficiency: 'good',
    recommendations: [],
    ...opts,
  };
}

import type { HourlyForecastItem } from '../../lib/plugins/baskWeather';
import { buildDay, uvBellCurve } from './hourlyForecasts';

export interface ScenarioOptions {
  date?: Date;
}

function defaultDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function makeClearSummerDay(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(10, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: () => 0,
  });
}

export function makePartlyCloudyDay(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(8, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: () => 0.4,
  });
}

export function makeOvercastAllDay(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(6, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: () => 0.9,
  });
}

export function makeWinterLowUVDay(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(2, { sunriseHour: 7, sunsetHour: 17 }),
    cloudAt: () => 0,
  });
}

export function makeClearNowCloudyLater(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(9, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: (hour) => (hour < 14 ? 0.05 : 0.95),
  });
}

export function makeCloudyNowClearLater(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(9, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: (hour) => (hour < 14 ? 0.95 : 0.05),
  });
}

export function makeUvExactlyAt3(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: (hour) => (hour >= 10 && hour <= 15 ? 3.0 : 0),
    cloudAt: () => 0,
  });
}

export function makeUvExactlyAt5(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: (hour) => (hour >= 10 && hour <= 15 ? 5.0 : 0),
    cloudAt: () => 0,
  });
}

export function makeAllCloudBlocked(opts: ScenarioOptions = {}): HourlyForecastItem[] {
  return buildDay({
    date: opts.date ?? defaultDate(),
    uvAt: uvBellCurve(7, { sunriseHour: 6, sunsetHour: 19 }),
    cloudAt: () => 1.0,
  });
}

export function makeTomorrow(opts: ScenarioOptions = {}): Date {
  const d = opts.date ?? defaultDate();
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  return t;
}

export { defaultDate };

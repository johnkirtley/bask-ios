import type { HourlyForecastItem } from '../../lib/plugins/baskWeather';

export interface BuildHourOptions {
  hour: number;
  uvIndex?: number;
  cloudCover?: number;
  temperature?: number;
  humidity?: number;
  symbolName?: string;
  condition?: string;
  date?: string;
}

export function buildHour(opts: BuildHourOptions): HourlyForecastItem {
  const date = opts.date ?? defaultIsoForHour(opts.hour);
  return {
    date,
    hour: opts.hour,
    temperature: opts.temperature ?? 20,
    uvIndex: opts.uvIndex ?? 0,
    cloudCover: opts.cloudCover ?? 0,
    humidity: opts.humidity ?? 0.5,
    symbolName: opts.symbolName ?? 'sun.max',
    condition: opts.condition ?? 'Clear',
  };
}

export interface BuildDayOptions {
  date?: Date;
  uvAt?: (hour: number) => number;
  cloudAt?: (hour: number) => number;
  uvIndex?: number;
  cloudCover?: number;
}

export function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDay(opts: BuildDayOptions = {}): HourlyForecastItem[] {
  const base = opts.date ?? new Date();
  const dateKey = localDateKey(base);

  return Array.from({ length: 24 }, (_, hour) => {
    const uvIndex = opts.uvAt ? opts.uvAt(hour) : (opts.uvIndex ?? 0);
    const cloudCover = opts.cloudAt ? opts.cloudAt(hour) : (opts.cloudCover ?? 0);
    return buildHour({
      hour,
      uvIndex,
      cloudCover,
      date: `${dateKey}T${String(hour).padStart(2, '0')}:00:00`,
    });
  });
}

export function buildForecast(
  today: HourlyForecastItem[],
  tomorrow?: HourlyForecastItem[],
): HourlyForecastItem[] {
  if (tomorrow) return [...today, ...tomorrow];
  return [...today];
}

export function tomorrowOfDay(base: Date = new Date()): Date {
  const t = new Date(base);
  t.setDate(t.getDate() + 1);
  return t;
}

function defaultIsoForHour(hour: number): string {
  const today = localDateKey(new Date());
  return `${today}T${String(hour).padStart(2, '0')}:00:00`;
}

export function uvBellCurve(peak: number, options?: { sunriseHour?: number; sunsetHour?: number; floor?: number }): (hour: number) => number {
  const sunrise = options?.sunriseHour ?? 6;
  const sunset = options?.sunsetHour ?? 19;
  const floor = options?.floor ?? 0;
  const noon = (sunrise + sunset) / 2;
  const halfWidth = (sunset - sunrise) / 2;

  return (hour: number): number => {
    if (hour < sunrise || hour > sunset) return floor;
    const distance = Math.abs(hour - noon) / halfWidth;
    const factor = Math.cos(distance * Math.PI / 2);
    return Number((peak * Math.max(0, factor)).toFixed(2));
  };
}

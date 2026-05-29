import type { HourlyForecastItem } from './plugins/baskWeather';

/**
 * Effective UV for an hour (matches home page / D-Window cloud attenuation).
 */
export function effectiveUvFromHour(hour: HourlyForecastItem): number {
  const raw = hour.uvIndex;
  return hour.cloudCover !== undefined
    ? raw * (1 - hour.cloudCover * 0.7)
    : raw;
}

/**
 * Representative UV for estimating vitamin D from a full day's passive Time in Daylight.
 * Uses today's forecast hours with synthesis-viable UV (>= 3), not the current moment —
 * avoids zeroing or skewing IU when sync runs at night or during low-UV weather.
 */
export function getRepresentativeUvForPassiveSync(
  currentEffectiveUv: number,
  hourlyForecast?: HourlyForecastItem[],
): number {
  if (hourlyForecast?.length) {
    const now = new Date();
    const todayHours = hourlyForecast.filter((h) => {
      const d = new Date(h.date);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });

    const viableUvs = todayHours
      .map(effectiveUvFromHour)
      .filter((uv) => uv >= 3);

    if (viableUvs.length > 0) {
      return viableUvs.reduce((sum, uv) => sum + uv, 0) / viableUvs.length;
    }
  }

  if (currentEffectiveUv >= 3) {
    return currentEffectiveUv;
  }

  return 5;
}

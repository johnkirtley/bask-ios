/**
 * Idle "Bask Now" call-to-action copy, derived from the live sun conditions.
 *
 * This is a small, special-cased helper (NOT a general phase engine). It decides
 * how the single home-screen hero is framed across the low-UV daylight window so
 * the button is never a dead-end and never mislabels "morning light" all day:
 *
 *   - effectiveUV >= 3            → vitamin D ("Bask Now")
 *   - sun up, UV < 3, morning/synthesis-coming → morning light (circadian)
 *   - sun up, UV < 3, evening                  → evening light (circadian)
 *   - sun up, UV < 3, otherwise                → generic low-UV light session
 *   - sun down                    → night (button disabled upstream; copy is fallback)
 *
 * "Sun up" includes UV 0 before sunset (a startable time-only light session).
 * Copy honestly distinguishes "clouds are blocking" (raw UV >= 3 but clouds cut it)
 * from "sun isn't high enough" (raw UV < 3), matching the rest of the app.
 */
import { getTimeOfDayFromHour } from '../hooks/useTimeOfDay';

export type TimeOfDayPhase = 'morning' | 'midday' | 'evening' | 'night';

export type BaskCtaVariant = 'vitaminD' | 'morningLight' | 'lowUv' | 'night';

/**
 * Solar timing inputs for sun-anchored phase decisions. Clock-hour buckets
 * (getTimeOfDayFromHour) misread long summer evenings — 7pm in Henderson can be
 * an hour before sunset — so light framing prefers real sunrise/sunset when
 * WeatherKit provides them, then the isDaylight flag, then the clock fallback.
 */
export interface SolarClock {
  /** Today's sunrise, epoch ms. */
  sunriseMs?: number;
  /** Today's sunset, epoch ms. */
  sunsetMs?: number;
  /** WeatherKit currentWeather.isDaylight (refreshed ~5 min). */
  isDaylightFlag?: boolean;
}

// Morning-light framing holds for the first hours after sunrise; evening-light
// framing for the final stretch before sunset. Between the two is plain daylight.
const MORNING_WINDOW_MS = 3 * 60 * 60 * 1000;
const EVENING_WINDOW_MS = 2 * 60 * 60 * 1000;

export function isSunUp(nowMs: number, solar: SolarClock): boolean {
  if (solar.sunriseMs != null && solar.sunsetMs != null) {
    return nowMs >= solar.sunriseMs && nowMs < solar.sunsetMs;
  }
  if (solar.isDaylightFlag != null) return solar.isDaylightFlag;
  return getTimeOfDayFromHour(new Date(nowMs).getHours()) !== 'night';
}

/**
 * Sun-anchored phase of day for light framing (greetings stay on the clock-based
 * useTimeOfDay). Reuses the TimeOfDayPhase union so existing consumers can take
 * either source.
 */
export function getSolarPhase(
  nowMs: number,
  solar: SolarClock,
): TimeOfDayPhase {
  if (!isSunUp(nowMs, solar)) return 'night';
  if (solar.sunriseMs != null && nowMs < solar.sunriseMs + MORNING_WINDOW_MS) {
    return 'morning';
  }
  if (solar.sunsetMs != null && nowMs >= solar.sunsetMs - EVENING_WINDOW_MS) {
    return 'evening';
  }
  if (solar.sunriseMs != null && solar.sunsetMs != null) return 'midday';
  // Sun is up but we only know it from the flag/clock — fall back to clock
  // buckets, coercing the contradiction (sun up but "night" hours) to midday.
  const clockPhase = getTimeOfDayFromHour(new Date(nowMs).getHours());
  return clockPhase === 'night' ? 'midday' : clockPhase;
}

export interface BaskCtaInput {
  /** Raw UV (clear-sky) — used only to phrase clouds-vs-low-sun. */
  rawUV: number;
  /** Cloud-adjusted UV — drives the phase decision. */
  effectiveUV: number;
  timeOfDay: TimeOfDayPhase;
  /** Minutes until today's synthesis window opens, or null if none coming/within 2h. */
  synthesisCountdownMin: number | null;
  /** Cloud cover fraction 0-1 (WeatherKit). Scales the morning-light target. */
  cloudCover?: number;
  /** Whether the sun is genuinely up (UV can read 0 near sunrise/sunset). */
  sunIsUp?: boolean;
}

export type MorningLightCondition = 'clear' | 'cloudy' | 'overcast';

export interface MorningLightRecommendation {
  /** Suggested outdoor minutes for a meaningful circadian "dose". */
  minutes: number;
  condition: MorningLightCondition;
}

/**
 * Recommended morning-light duration, scaled to sky conditions. Brighter skies
 * deliver more lux, so they need less time; overcast needs more. Tiers follow
 * common circadian guidance (≈10 min clear / 20 cloudy / 30 overcast). It's
 * general guidance rather than a medical prescription, so phrase it as
 * "aim for ~N min".
 */
export function morningLightRecommendation(
  cloudCover?: number,
): MorningLightRecommendation {
  const cc = cloudCover ?? 0;
  if (cc >= 0.7) return { minutes: 30, condition: 'overcast' };
  if (cc >= 0.3) return { minutes: 20, condition: 'cloudy' };
  return { minutes: 10, condition: 'clear' };
}

export interface BaskCta {
  variant: BaskCtaVariant;
  label: string;
  helper: string;
}

const VITAMIN_D: BaskCta = {
  variant: 'vitaminD',
  label: 'Bask Now',
  helper: 'Tap to start tracking your sun exposure',
};

export function getBaskCta({
  rawUV,
  effectiveUV,
  timeOfDay,
  synthesisCountdownMin,
  cloudCover,
  sunIsUp,
}: BaskCtaInput): BaskCta {
  // Strong enough for vitamin D right now → normal Bask.
  if (effectiveUV >= 3) return VITAMIN_D;

  // Daylight but below the synthesis threshold → a startable "light" session.
  // UV reads 0 in the last stretch before sunset, so "sun up" keeps the button
  // alive for time-only evening light sessions.
  if (effectiveUV > 0 || sunIsUp) {
    // Sun is up (raw >= 3) but clouds are cutting effective UV below 3.
    const cloudsBlocking = rawUV >= 3;
    // Promote *morning light* only when it's honest: actually morning, or vitamin D
    // is genuinely coming later today (countdown present).
    const morningContext =
      synthesisCountdownMin != null || timeOfDay === 'morning';

    if (morningContext) {
      // Only call it "morning" when it actually is — a late-clearing day can have a
      // synthesis countdown in the afternoon. Keep the circadian accent either way.
      // Labels are kept short so the CTA never wraps to two lines.
      const isMorning = timeOfDay === 'morning';
      const label = isMorning ? 'Get morning light' : 'Get some light';
      // The vitamin D countdown lives on the live session and D-Window views, so the
      // helper here focuses on why morning light is worth it now, not a repeat clock.
      // When clouds are the blocker, the cloud story is the honest lead; otherwise we
      // surface the adaptive target with the reference-app's energy/mood/sleep framing.
      const rec = morningLightRecommendation(cloudCover);
      const helper = cloudsBlocking
        ? 'Clouds are blocking vitamin D, but light still supports your rhythm'
        : `UV isn't strong enough for vitamin D right now, but ~${
            rec.minutes
          } min of ${
            isMorning ? 'morning light' : 'daylight'
          } supports energy, mood, and sleep`;
      return { variant: 'morningLight', label, helper };
    }

    // Pre-sunset stretch: the sun is low, vitamin D is done for the day, but
    // evening light is still a worthwhile circadian session.
    if (timeOfDay === 'evening') {
      const helper = cloudsBlocking
        ? 'Clouds are blocking vitamin D, but evening light still supports your rhythm'
        : 'No vitamin D this late, but evening light still supports your circadian rhythm';
      return { variant: 'lowUv', label: 'Get evening light', helper };
    }

    const helper = cloudsBlocking
      ? 'Clouds are blocking vitamin D right now, but getting sunlight still helps'
      : "UV isn't strong enough for vitamin D right now, but getting sunlight still helps";
    return { variant: 'lowUv', label: 'Get some light', helper };
  }

  // Night / after sunset — button is disabled upstream; this copy is a fallback.
  return { ...VITAMIN_D, variant: 'night' };
}

/**
 * The analytics phase a started session begins in (mirrors the CTA variant, but
 * collapses the disabled 'night' case which can't start a session).
 */
export function ctaVariantToPhase(
  variant: BaskCtaVariant,
): 'morning_light' | 'low_uv' | 'vitamin_d' {
  switch (variant) {
    case 'morningLight':
      return 'morning_light';
    case 'lowUv':
      return 'low_uv';
    default:
      return 'vitamin_d';
  }
}

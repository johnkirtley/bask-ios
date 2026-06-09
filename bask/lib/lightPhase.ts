/**
 * Idle "Bask Now" call-to-action copy, derived from the live sun conditions.
 *
 * This is a small, special-cased helper (NOT a general phase engine). It decides
 * how the single home-screen hero is framed across the low-UV daylight window so
 * the button is never a dead-end and never mislabels "morning light" all day:
 *
 *   - effectiveUV >= 3            → vitamin D ("Bask Now")
 *   - 0 < effectiveUV < 3, morning/synthesis-coming → morning light (circadian)
 *   - 0 < effectiveUV < 3, otherwise               → generic low-UV light session
 *   - effectiveUV <= 0            → night (button disabled upstream; copy is fallback)
 *
 * Copy honestly distinguishes "clouds are blocking" (raw UV >= 3 but clouds cut it)
 * from "sun isn't high enough" (raw UV < 3), matching the rest of the app.
 */
export type TimeOfDayPhase = 'morning' | 'midday' | 'evening' | 'night';

export type BaskCtaVariant = 'vitaminD' | 'morningLight' | 'lowUv' | 'night';

export interface BaskCtaInput {
  /** Raw UV (clear-sky) — used only to phrase clouds-vs-low-sun. */
  rawUV: number;
  /** Cloud-adjusted UV — drives the phase decision. */
  effectiveUV: number;
  timeOfDay: TimeOfDayPhase;
  /** Minutes until today's synthesis window opens, or null if none coming/within 2h. */
  synthesisCountdownMin: number | null;
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
}: BaskCtaInput): BaskCta {
  // Strong enough for vitamin D right now → normal Bask.
  if (effectiveUV >= 3) return VITAMIN_D;

  // Daylight but below the synthesis threshold → a startable "light" session.
  if (effectiveUV > 0) {
    // Sun is up (raw >= 3) but clouds are cutting effective UV below 3.
    const cloudsBlocking = rawUV >= 3;
    // Promote *morning light* only when it's honest: actually morning, or vitamin D
    // is genuinely coming later today (countdown present).
    const morningContext = synthesisCountdownMin != null || timeOfDay === 'morning';

    if (morningContext) {
      // Only call it "morning" when it actually is — a late-clearing day can have a
      // synthesis countdown in the afternoon. Keep the circadian accent either way.
      // Labels are kept short so the CTA never wraps to two lines.
      const isMorning = timeOfDay === 'morning';
      const label = isMorning ? 'Get morning light' : 'Get some light';
      let helper: string;
      if (synthesisCountdownMin != null) {
        helper = `${isMorning ? 'Morning light' : 'Light'} now · vitamin D starts in ${synthesisCountdownMin} min`;
      } else if (cloudsBlocking) {
        helper = 'Clouds are blocking vitamin D — light still supports your rhythm';
      } else {
        helper = "Great for your circadian rhythm — UV isn't strong enough for vitamin D yet";
      }
      return { variant: 'morningLight', label, helper };
    }

    const helper = cloudsBlocking
      ? 'Clouds are blocking vitamin D right now — but getting sunlight still helps'
      : "UV isn't strong enough for vitamin D right now — but getting sunlight still helps";
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

import { getSolarPhase, type SolarClock, type TimeOfDayPhase } from './lightPhase';
import type { LiveActivityPhase } from './plugins';

/**
 * Phase label for the lock screen / Dynamic Island. Pre-synthesis sessions are
 * only "morning light" when it's actually morning — computed sun-anchored at
 * each update so a session that outlives its window flips live, matching the
 * in-app hero label. "night" reads as evening light: a session can outlive
 * sunset by a few minutes.
 */
export function lightPhaseForLiveActivity(
  hasSynthesized: boolean,
  solar: SolarClock,
  nowMs: number = Date.now(),
): LiveActivityPhase {
  if (hasSynthesized) return 'vitaminD';
  const phase = getSolarPhase(nowMs, solar);
  if (phase === 'morning') return 'morningLight';
  if (phase === 'evening' || phase === 'night') return 'eveningLight';
  return 'daylight';
}

/**
 * Format elapsed seconds as MM:SS for the session timer display.
 */
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

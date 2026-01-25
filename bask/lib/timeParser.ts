/**
 * Time-based reps parser utility
 *
 * Detects if an exercise reps string is time-based (e.g., "30-45 sec hold")
 * and extracts the duration for timer functionality.
 */

export interface TimeBasedRepsResult {
  isTimeBased: boolean;
  seconds?: number; // Middle value for timer
  minSeconds?: number;
  maxSeconds?: number;
  sets?: number;
  perSide?: boolean;
  displayText?: string; // Original reps part (e.g., "30-45 sec hold")
}

/**
 * Parse a reps string to determine if it's time-based.
 *
 * Handles patterns like:
 * - '30-45 sec hold - 2 sets'
 * - '30-60 sec - 2 sets'
 * - '30 sec hold - 1 set'
 * - '20-30 sec hold each side - 2 sets'
 * - '30-60 hold - 2 sets' (missing "sec")
 *
 * Does NOT match rep-based with holds:
 * - '10 reps (5 sec hold) - 2 sets' -> treated as rep-based
 * - '6-8 reps - 3 sets' -> not time-based
 */
export function parseTimeBasedReps(reps: string): TimeBasedRepsResult {
  if (!reps) {
    return { isTimeBased: false };
  }

  // Skip if it's clearly rep-based (contains "reps")
  if (/\d+(?:-\d+)?\s*reps/i.test(reps)) {
    return { isTimeBased: false };
  }

  // Pattern: captures time duration with "sec/seconds" or "hold" keyword
  // Matches: "30-45 sec hold", "30 sec", "30-60 seconds", "30-60 hold"
  const timePattern =
    /^(\d+)(?:-(\d+))?\s*(?:sec(?:ond)?s?|hold)(?:\s+each\s+side)?/i;

  // Also need to verify this is actually time-based (has "sec", "second", or "hold" keyword)
  const hasTimeKeyword = /\b(?:sec(?:ond)?s?|hold)\b/i.test(reps);

  if (!hasTimeKeyword) {
    return { isTimeBased: false };
  }

  const match = reps.match(timePattern);

  if (!match) {
    return { isTimeBased: false };
  }

  const minSeconds = parseInt(match[1], 10);
  const maxSeconds = match[2] ? parseInt(match[2], 10) : minSeconds;

  // Calculate middle value for timer (minimum 1 second)
  const seconds = Math.max(1, Math.round((minSeconds + maxSeconds) / 2));

  // Extract sets count
  const setsMatch = reps.match(/(\d+)\s*sets?/i);
  const sets = setsMatch ? parseInt(setsMatch[1], 10) : undefined;

  // Check for "each side" or "per side"
  const perSide = /each\s+side|per\s+side/i.test(reps);

  // Extract display text (the time part)
  const displayMatch = reps.match(
    /^(\d+(?:-\d+)?\s*(?:sec(?:ond)?s?)?\s*(?:hold)?s?(?:\s+each\s+side)?)/i
  );
  const displayText = displayMatch ? displayMatch[1].trim() : undefined;

  return {
    isTimeBased: true,
    seconds,
    minSeconds,
    maxSeconds,
    sets,
    perSide,
    displayText,
  };
}

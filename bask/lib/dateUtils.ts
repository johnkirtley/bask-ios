/**
 * Format a Date as YYYY-MM-DD in the user's local timezone.
 * Avoids UTC drift from toISOString().split('T')[0].
 */
export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

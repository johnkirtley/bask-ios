'use client';

interface StreakBadgeProps {
  currentStreak: number;
  onPress: () => void;
}

export default function StreakBadge({
  currentStreak,
  onPress,
}: StreakBadgeProps) {
  if (currentStreak < 2) return null;

  return (
    <button
      type='button'
      onClick={onPress}
      className='flame-pulse inline-flex items-center gap-1.5 rounded-full bg-solar-flare/15 px-3 py-1.5 text-sm font-bold text-solar-warm shadow-sm active:scale-95'
      aria-label={`Open ${currentStreak} day streak details`}>
      <span aria-hidden='true'>🔥</span>
      <span className='tabular-nums'>{currentStreak}</span>
    </button>
  );
}

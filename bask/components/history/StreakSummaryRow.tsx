'use client';

interface StreakSummaryRowProps {
  currentStreak: number;
  onPress: () => void;
}

export default function StreakSummaryRow({
  currentStreak,
  onPress,
}: StreakSummaryRowProps) {
  if (currentStreak <= 0) return null;

  return (
    <button
      type='button'
      onClick={onPress}
      className='mx-auto mt-4 flex items-center justify-center gap-2 rounded-full bg-solar-flare/15 px-4 py-2 text-sm font-bold text-solar-warm shadow-sm active:scale-[0.98]'
      aria-label={`Open ${currentStreak} day streak details`}>
      <span aria-hidden='true'>🔥</span>
      <span>
        {currentStreak} Day Streak
      </span>
    </button>
  );
}

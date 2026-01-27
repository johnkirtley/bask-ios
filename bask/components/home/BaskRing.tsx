'use client';

import { useMemo } from 'react';

interface BaskRingProps {
  vitaminDProgress: number; // 0-100
  vitaminDGoal: number; // IU
  vitaminDCurrent: number; // IU
}

/**
 * Single glowing ring showing vitamin D progress
 * Matches the premium dark aesthetic from reference
 */
export default function BaskRing({
  vitaminDProgress,
  vitaminDGoal,
  vitaminDCurrent,
}: BaskRingProps) {
  // Ring dimensions
  const size = 300;
  const strokeWidth = 16;
  const radius = 130;

  // Calculate circumference
  const circumference = 2 * Math.PI * radius;

  // Calculate progress offset
  const offset = useMemo(() => {
    const progress = Math.min(100, Math.max(0, vitaminDProgress));
    return circumference - (progress / 100) * circumference;
  }, [vitaminDProgress, circumference]);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 ring-glow"
          role="img"
          aria-label={`Vitamin D: ${vitaminDCurrent} of ${vitaminDGoal} IU`}>
          {/* Background track - subtle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(212, 165, 116, 0.15)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring with gradient */}
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="50%" stopColor="#E8A959" />
              <stop offset="100%" stopColor="#E86F1B" />
            </linearGradient>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="bask-ring-progress"
            role="progressbar"
            aria-valuenow={vitaminDProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-7xl font-bold text-white tracking-tight">
            {vitaminDCurrent}
          </div>
          <div className="text-sm font-medium text-text-secondary mt-2">
            IU
          </div>
          <div className="text-xs text-text-muted mt-1">
            Daily Goal: {vitaminDGoal} IU
          </div>
        </div>
      </div>
    </div>
  );
}

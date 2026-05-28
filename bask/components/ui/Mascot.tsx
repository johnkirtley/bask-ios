'use client';

import React from 'react';

export type MascotMood = 'happy' | 'excited' | 'sleepy' | 'cloudy' | 'burning';

interface MascotProps {
  size?: number;
  mood?: MascotMood;
  floating?: boolean;
  className?: string;
  /** Accessible label. When omitted (default), the mascot is treated as decorative and hidden from screen readers. */
  label?: string;
}

const moodTransforms: Record<MascotMood, { transform: string; filter?: string }> = {
  happy: {
    transform: 'rotate(-2deg)',
  },
  excited: {
    transform: 'rotate(-4deg) scale(1.04)',
    filter: 'saturate(1.15) brightness(1.05)',
  },
  sleepy: {
    transform: 'rotate(-8deg) scale(0.95)',
    filter: 'saturate(0.5) brightness(0.85) hue-rotate(-10deg)',
  },
  cloudy: {
    transform: 'rotate(-3deg)',
    filter: 'saturate(0.6) brightness(0.92)',
  },
  burning: {
    transform: 'rotate(-2deg)',
    filter: 'saturate(1.3) hue-rotate(-15deg)',
  },
};

export default function Mascot({
  size = 120,
  mood = 'happy',
  floating = true,
  className = '',
  label,
}: MascotProps) {
  const { transform, filter } = moodTransforms[mood];
  const decorative = !label;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${floating ? 'mascot-float' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src="/assets/mascot.png"
        alt={decorative ? '' : label}
        width={size}
        height={size}
        className="select-none pointer-events-none"
        style={{
          transform,
          filter,
          transition: 'transform 0.5s ease-out, filter 0.5s ease-out',
        }}
        draggable={false}
      />

      {/* Sleepy mood: zzz overlay */}
      {mood === 'sleepy' && (
        <span
          className="absolute text-[#7A6E58] font-extrabold select-none pointer-events-none"
          style={{
            top: '10%',
            right: '5%',
            fontSize: size * 0.15,
            opacity: 0.6,
          }}
          aria-hidden="true"
        >
          zzz
        </span>
      )}
    </div>
  );
}

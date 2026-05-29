'use client';

import React from 'react';
import { WARM } from './atoms';

const COLORS = [WARM.sun, WARM.sunDeep, WARM.accent, WARM.good, '#FFD976'];
const COUNT = 44;

// One-shot confetti burst. No-ops under prefers-reduced-motion (CSS hides bits).
export function Confetti() {
  const bits = React.useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const size = 7 + Math.round(Math.random() * 7);
        return {
          key: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.5,
          duration: 1.6 + Math.random() * 1.4,
          color: COLORS[i % COLORS.length],
          width: size,
          height: size * (Math.random() > 0.5 ? 1.6 : 1),
          radius: Math.random() > 0.5 ? '50%' : '2px',
        };
      }),
    []
  );

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 60,
      }}
    >
      {bits.map((b) => (
        <span
          key={b.key}
          className="warm-confetti-bit"
          style={{
            position: 'absolute',
            top: 0,
            left: `${b.left}%`,
            width: b.width,
            height: b.height,
            background: b.color,
            borderRadius: b.radius,
            animation: `warm-confetti-fall ${b.duration}s linear ${b.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

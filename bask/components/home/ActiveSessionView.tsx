'use client';

import AtmosphericBackground from './AtmosphericBackground';
import GlassCard from './GlassCard';
import type { SunData } from '../../lib/mockData';

interface ActiveSessionViewProps {
  formattedTime: string;
  currentIU: number;
  projectedTimeToBurn: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
}

/**
 * Active session view showing real-time timer and vitamin D tracking
 */
export default function ActiveSessionView({
  formattedTime,
  currentIU,
  projectedTimeToBurn,
  isPaused,
  onPause,
  onResume,
  onEnd,
  onCancel,
}: ActiveSessionViewProps) {
  return (
    <AtmosphericBackground>
      <div className="pb-24 pt-safe">
        {/* Header */}
        <div className="px-6 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-white">
            {isPaused ? 'Paused' : 'Basking...'}
          </h1>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-white/70">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Timer Ring */}
        <div className="flex flex-col items-center py-12">
          <div className="relative" style={{ width: 300, height: 300 }}>
            {/* Animated ring */}
            <svg
              width={300}
              height={300}
              className="transform -rotate-90 ring-glow">
              {/* Background track */}
              <circle
                cx={150}
                cy={150}
                r={130}
                fill="none"
                stroke="rgba(212, 165, 116, 0.15)"
                strokeWidth={16}
              />

              {/* Animated progress ring */}
              <defs>
                <linearGradient id="sessionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4A574" />
                  <stop offset="50%" stopColor="#E8A959" />
                  <stop offset="100%" stopColor="#E86F1B" />
                </linearGradient>
              </defs>

              <circle
                cx={150}
                cy={150}
                r={130}
                fill="none"
                stroke="url(#sessionGradient)"
                strokeWidth={16}
                strokeLinecap="round"
                className={`bask-ring-progress ${isPaused ? 'opacity-50' : ''}`}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-6xl font-bold text-white tracking-tight">
                {formattedTime}
              </div>
              <div className="text-lg font-medium text-[#E8A959] mt-3">
                +{currentIU} IU
              </div>
              {isPaused && (
                <div className="text-xs text-text-muted mt-2">
                  Session paused
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="px-6 grid grid-cols-2 gap-4">
          <GlassCard label="Session IU" value={currentIU} />
          <GlassCard label="Time to Burn" value={`${projectedTimeToBurn}m`} />
        </div>

        {/* Control Buttons */}
        <div className="px-6 mt-8 flex gap-4">
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex-1 py-4 bg-[#E8A959] hover:bg-[#E8A959]/90 rounded-full text-lg font-bold text-[#1A1A1A] transition-colors">
              Resume
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex-1 py-4 bg-white/20 hover:bg-white/30 rounded-full text-lg font-bold text-white transition-colors">
              Pause
            </button>
          )}
          <button
            onClick={onEnd}
            className="flex-1 py-4 bg-white hover:bg-white/90 rounded-full text-lg font-bold text-[#1A1A1A] transition-colors">
            End Session
          </button>
        </div>
      </div>
    </AtmosphericBackground>
  );
}

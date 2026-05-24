'use client';

import { useMemo, useState, useEffect } from 'react';
import { IonAlert } from '@ionic/react';
import { userProfileRepository } from '@/lib/database/repositories/userProfileRepository';

interface BaskRingProps {
  vitaminDProgress: number; // 0-100
  vitaminDGoal: number; // IU
  vitaminDCurrent: number; // IU
  onGoalUpdated?: () => void; // Callback to refresh data after goal change
}

/**
 * D-Pulse Ring - Living sunlight captured in glass
 * Warm, breathing, optimistic energy for light mode
 */
export default function BaskRing({
  vitaminDProgress,
  vitaminDGoal,
  vitaminDCurrent,
  onGoalUpdated,
}: BaskRingProps) {
  const [showGoalAlert, setShowGoalAlert] = useState(false);
  const [displayedGoal, setDisplayedGoal] = useState<number | null>(null);

  // Load goal from DB on mount to avoid showing default 5000
  useEffect(() => {
    userProfileRepository.get().then(profile => {
      if (profile?.daily_goal) {
        setDisplayedGoal(profile.daily_goal);
      }
    }).catch(err => {
      console.warn('Failed to load goal from DB:', err);
    });
  }, []);

  // Sync from prop when it changes (ignore the initial 5000 default)
  useEffect(() => {
    if (vitaminDGoal && vitaminDGoal !== 5000) {
      setDisplayedGoal(vitaminDGoal);
    }
  }, [vitaminDGoal]);

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

  const handleGoalUpdate = async (newGoal: number) => {
    try {
      setDisplayedGoal(newGoal); // Update immediately (optimistic)
      await userProfileRepository.setDailyGoal(newGoal);
      onGoalUpdated?.(); // Trigger refresh
    } catch (error) {
      console.error('Failed to update daily goal:', error);
    }
  };

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative" style={{ width: size, height: size }}>
        {/* D-Pulse: Breathing ambient glow - like captured sunlight */}
        <div
          className="absolute inset-0 rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, rgba(255, 179, 71, 0.25) 0%, rgba(255, 179, 71, 0.12) 40%, rgba(255, 159, 28, 0.05) 60%, transparent 80%)',
            animation: 'd-pulse 4s ease-in-out infinite',
          }}
        />

        {/* Secondary glow layer for depth */}
        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(255, 179, 71, 0.15) 20%, transparent 70%)',
            animation: 'd-pulse-secondary 4s ease-in-out infinite 0.5s',
          }}
        />

        <svg
          width={size}
          height={size}
          className="transform -rotate-90 relative z-10"
          role="img"
          aria-label={`Vitamin D: ${vitaminDCurrent} of ${vitaminDGoal} IU`}>
          {/* Background track - warm, subtle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 179, 71, 0.12)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring with Solar Flare gradient and living glow */}
          <defs>
            <linearGradient id="solarFlareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="50%" stopColor="#FF9F1C" />
              <stop offset="100%" stopColor="#E86F1B" />
            </linearGradient>
            {/* Enhanced glow for light mode visibility */}
            <filter id="solarGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.5 0"
                result="intensifiedBlur"
              />
              <feMerge>
                <feMergeNode in="intensifiedBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#solarFlareGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#solarGlowFilter)"
            className="bask-ring-progress"
            style={{
              animation: 'ring-pulse 4s ease-in-out infinite',
            }}
            role="progressbar"
            aria-valuenow={vitaminDProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </svg>

        {/* Center content - refined typography with serif emphasis */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <div className="font-title text-5xl text-text-primary tracking-tight tabular-nums" aria-live="polite" aria-atomic="true">
            {vitaminDCurrent}<span className="text-sm font-semibold text-text-secondary ml-1">IU</span>
          </div>
          <button
            onClick={() => setShowGoalAlert(true)}
            className="text-xs font-medium text-text-secondary mt-1.5 flex items-center gap-1 hover:text-text-primary transition-colors active:scale-95"
            aria-label="Edit daily goal">
            Daily Goal: {displayedGoal ?? vitaminDGoal} IU
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3 h-3">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Goal edit alert */}
      <IonAlert
        isOpen={showGoalAlert}
        onDidDismiss={() => setShowGoalAlert(false)}
        header="Set Daily Goal"
        message="Enter your daily vitamin D goal in IU:"
        inputs={[
          {
            name: 'goal',
            type: 'number',
            placeholder: 'e.g., 5000',
            value: displayedGoal ?? vitaminDGoal,
            min: 0,
            max: 50000,
          },
        ]}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Save',
            handler: (data) => {
              const newGoal = parseInt(data.goal, 10);
              if (newGoal && newGoal > 0 && newGoal <= 50000) {
                handleGoalUpdate(newGoal);
                return true;
              }
              return false;
            },
          },
        ]}
      />

      {/* Inline CSS for D-Pulse animations */}
      <style jsx>{`
        @keyframes d-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes d-pulse-secondary {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.4;
          }
        }

        @keyframes ring-pulse {
          0%, 100% {
            filter: url(#solarGlowFilter) drop-shadow(0 0 4px rgba(255, 179, 71, 0.3));
          }
          50% {
            filter: url(#solarGlowFilter) drop-shadow(0 0 8px rgba(255, 179, 71, 0.5));
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useMemo, useState, useEffect } from 'react';
import { IonAlert } from '@ionic/react';
import { userProfileRepository } from '@/lib/database/repositories/userProfileRepository';
import { capture, ANALYTICS_EVENTS } from '@/lib/analytics';
import { DEFAULT_DAILY_GOAL_IU } from '@/lib/constants';
import Mascot from '../ui/Mascot';
import { getMascotMood } from '@/lib/mascotUtils';

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

  // Load goal from DB on mount to avoid showing a fallback goal.
  useEffect(() => {
    userProfileRepository.get().then(profile => {
      if (profile?.daily_goal) {
        setDisplayedGoal(profile.daily_goal);
      }
    }).catch(err => {
      console.warn('Failed to load goal from DB:', err);
    });
  }, []);

  // Sync from prop when it changes.
  useEffect(() => {
    if (vitaminDGoal) {
      setDisplayedGoal(vitaminDGoal);
    }
  }, [vitaminDGoal]);

  // Derive mascot mood from progress
  const goalProgress = vitaminDGoal > 0 ? vitaminDCurrent / vitaminDGoal : 0;
  const mascotMood = getMascotMood({ goalProgress });

  // Responsive IU number sizing so large values (e.g. "50,000") don't crowd
  // the "IU" label. tabular-nums keeps the width stable as the count ticks up.
  const currentLabel = vitaminDCurrent.toLocaleString();
  const numberSizeClass =
    currentLabel.length >= 6
      ? 'text-[44px]'
      : currentLabel.length >= 5
        ? 'text-[50px]'
        : 'text-[56px]';

  // Ring dimensions
  const size = 260;
  const strokeWidth = 10;
  const radius = 120;

  // Calculate circumference
  const circumference = 2 * Math.PI * radius;

  // Calculate progress offset
  const offset = useMemo(() => {
    const progress = Math.min(100, Math.max(0, vitaminDProgress));
    return circumference - (progress / 100) * circumference;
  }, [vitaminDProgress, circumference]);

  const handleGoalUpdate = async (newGoal: number) => {
    try {
      capture(ANALYTICS_EVENTS.dailyGoalChanged, {
        new_goal_iu: newGoal,
        previous_goal_iu: displayedGoal ?? vitaminDGoal,
      });
      setDisplayedGoal(newGoal); // Update immediately (optimistic)
      await userProfileRepository.setDailyGoal(newGoal);
      onGoalUpdated?.(); // Trigger refresh
    } catch (error) {
      console.error('Failed to update daily goal:', error);
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      {/* Ring + Mascot container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Pulsing halo behind mascot */}
        <div
          className="absolute mascot-halo-pulse rounded-full"
          style={{
            width: size * 0.8,
            height: size * 0.8,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(26, 161, 162, 0.12) 0%, transparent 70%)',
          }}
        />

        <svg
          width={size}
          height={size}
          className="transform -rotate-90 relative z-10"
          role="img"
          aria-label={`Vitamin D: ${vitaminDCurrent} of ${vitaminDGoal} IU`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(26, 161, 162, 0.25)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring with sun gradient */}
          <defs>
            <linearGradient id="solarFlareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC93C" />
              <stop offset="100%" stopColor="#F4A536" />
            </linearGradient>
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
            className="bask-ring-progress"
            role="progressbar"
            aria-valuenow={vitaminDProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </svg>

        {/* Mascot centered in ring */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Mascot size={160} mood={mascotMood} />
        </div>
      </div>

      {/* IU readout below ring */}
      <div className="flex flex-col items-center mt-2 text-center">
        <div className="flex items-baseline gap-1" aria-live="polite" aria-atomic="true">
          <span className={`font-black ${numberSizeClass} text-text-primary tracking-tight tabular-nums leading-none`}>
            {currentLabel}
          </span>
          <span className="font-extrabold text-lg text-text-secondary">IU</span>
        </div>
        <button
          onClick={() => setShowGoalAlert(true)}
          className="text-sm font-semibold text-text-secondary mt-1 flex items-center gap-1 hover:text-text-primary transition-colors active:scale-[0.98]"
          aria-label="Edit daily goal">
          of {(displayedGoal ?? vitaminDGoal).toLocaleString()} today
          <span className="text-text-muted">· edit</span>
        </button>
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
            placeholder: `e.g., ${DEFAULT_DAILY_GOAL_IU}`,
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
    </div>
  );
}

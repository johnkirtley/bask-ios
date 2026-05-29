'use client';

import { useCallback, useState } from 'react';
import {
  GoalStreakSummary,
  streaksRepository,
  streakStateRepository,
  StreakState,
  StreakTransitionReason,
  StreakTransitionResult,
} from '../lib/database';
import { notificationService } from '../lib/services/notificationService';
import { leaderboardService } from '../lib/supabase/leaderboardService';

interface UseStreakStateResult {
  summary: GoalStreakSummary | null;
  state: StreakState | null;
  isLoading: boolean;
  firstLogToastOpen: boolean;
  pendingMilestone: number | null;
  refreshStreak: (
    reason?: StreakTransitionReason,
  ) => Promise<StreakTransitionResult | null>;
  dismissFirstLogToast: () => void;
  dismissMilestone: () => Promise<void>;
}

export function useStreakState(dailyGoal?: number): UseStreakStateResult {
  const [summary, setSummary] = useState<GoalStreakSummary | null>(null);
  const [state, setState] = useState<StreakState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstLogToastOpen, setFirstLogToastOpen] = useState(false);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

  const refreshStreak = useCallback(
    async (
      reason: StreakTransitionReason = 'manual',
    ): Promise<StreakTransitionResult | null> => {
      setIsLoading(true);

      try {
        const result = await streaksRepository.recomputeAndPersistStreak(
          dailyGoal,
          reason,
        );

        setSummary(result.summary);
        setState(result.state);

        void leaderboardService.submitStreak({
          currentStreak: result.summary.currentStreak,
          longestStreak: result.summary.longestStreak,
        });

        if (result.events.streakStarted) {
          setFirstLogToastOpen(true);
        }

        if (result.events.milestoneReached !== null) {
          setPendingMilestone(result.events.milestoneReached);
        }

        if (reason === 'app_open') {
          await notificationService.cancelStreakRevivalIfBeforeNine(result.state);
        } else if (result.events.streakDied) {
          await notificationService.scheduleStreakRevivalNotification(result.state);
        }

        return result;
      } catch (error) {
        console.error('Failed to refresh streak state:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dailyGoal],
  );

  const dismissMilestone = useCallback(async () => {
    if (pendingMilestone === null) return;

    try {
      const current = await streakStateRepository.get();
      const milestonesAchieved = Array.from(
        new Set([...current.milestonesAchieved, pendingMilestone]),
      ).sort((a, b) => a - b);
      const nextState = await streakStateRepository.patch({
        milestonesAchieved,
      });
      setState(nextState);
    } catch (error) {
      console.error('Failed to mark streak milestone achieved:', error);
    } finally {
      setPendingMilestone(null);
    }
  }, [pendingMilestone]);

  return {
    summary,
    state,
    isLoading,
    firstLogToastOpen,
    pendingMilestone,
    refreshStreak,
    dismissFirstLogToast: () => setFirstLogToastOpen(false),
    dismissMilestone,
  };
}

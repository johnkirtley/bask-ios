'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { REVIEW_MILESTONES, STORAGE_KEYS } from '../lib/constants';
import { settingsRepository } from '../lib/database/repositories/settingsRepository';

export type MilestoneId = 'milestone1' | 'milestone2' | 'milestone3';

interface MilestoneConfig {
  id: string;
  storageKey: string;
  headline: string;
  body: string;
  threshold?: number;
}

interface HappinessFilterState {
  activeMilestone: MilestoneConfig | null;
  isModalOpen: boolean;
}

interface ProgressSnapshot {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  previousLongestStreak: number;
}

export function useHappinessFilter() {
  const [state, setState] = useState<HappinessFilterState>({
    activeMilestone: null,
    isModalOpen: false,
  });

  const triggeredRef = useRef<Set<string>>(new Set());
  const isLoadedRef = useRef(false);
  const reviewCompletedRef = useRef(false);

  useEffect(() => {
    async function loadTriggered() {
      try {
        if (Capacitor.isNativePlatform()) {
          const reviewCompleted = await settingsRepository.get(STORAGE_KEYS.reviewCompleted);
          reviewCompletedRef.current = reviewCompleted === 'true';

          for (const milestone of Object.values(REVIEW_MILESTONES)) {
            const val = await settingsRepository.get(milestone.storageKey);
            if (val === 'true') {
              triggeredRef.current.add(milestone.id);
            }
          }
        } else {
          const reviewCompleted = localStorage.getItem(STORAGE_KEYS.reviewCompleted);
          reviewCompletedRef.current = reviewCompleted === 'true';

          for (const milestone of Object.values(REVIEW_MILESTONES)) {
            const val = localStorage.getItem(milestone.storageKey);
            if (val === 'true') {
              triggeredRef.current.add(milestone.id);
            }
          }
        }
        isLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load review milestones:', err);
        isLoadedRef.current = true;
      }
    }
    loadTriggered();
  }, []);

  const markTriggered = useCallback(async (milestoneId: string, storageKey: string) => {
    triggeredRef.current.add(milestoneId);
    try {
      if (Capacitor.isNativePlatform()) {
        await settingsRepository.set(storageKey, 'true');
      } else {
        localStorage.setItem(storageKey, 'true');
      }
    } catch (err) {
      console.error('Failed to persist review milestone:', err);
    }
  }, []);

  const markReviewCompleted = useCallback(async () => {
    reviewCompletedRef.current = true;

    for (const milestone of Object.values(REVIEW_MILESTONES)) {
      await markTriggered(milestone.id, milestone.storageKey);
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await settingsRepository.set(STORAGE_KEYS.reviewCompleted, 'true');
      } else {
        localStorage.setItem(STORAGE_KEYS.reviewCompleted, 'true');
      }
    } catch (err) {
      console.error('Failed to mark review as completed:', err);
    }
  }, [markTriggered]);

  const checkMilestones = useCallback((progressSnapshot: ProgressSnapshot) => {
    if (!isLoadedRef.current) return;

    if (reviewCompletedRef.current) return;

    // Milestone 1: threshold-based
    if (
      REVIEW_MILESTONES.milestone1.threshold &&
      progressSnapshot.totalCompletions >= REVIEW_MILESTONES.milestone1.threshold &&
      !triggeredRef.current.has(REVIEW_MILESTONES.milestone1.id)
    ) {
      setState({
        activeMilestone: REVIEW_MILESTONES.milestone1,
        isModalOpen: true,
      });
      markTriggered(
        REVIEW_MILESTONES.milestone1.id,
        REVIEW_MILESTONES.milestone1.storageKey
      );
      return;
    }

    // Milestone 2: new longest streak
    if (
      progressSnapshot.longestStreak > progressSnapshot.previousLongestStreak &&
      progressSnapshot.previousLongestStreak > 0 &&
      !triggeredRef.current.has(REVIEW_MILESTONES.milestone2.id)
    ) {
      setState({
        activeMilestone: REVIEW_MILESTONES.milestone2,
        isModalOpen: true,
      });
      markTriggered(
        REVIEW_MILESTONES.milestone2.id,
        REVIEW_MILESTONES.milestone2.storageKey
      );
      return;
    }

    // Milestone 3: threshold-based
    if (
      REVIEW_MILESTONES.milestone3.threshold &&
      progressSnapshot.currentStreak >= REVIEW_MILESTONES.milestone3.threshold &&
      !triggeredRef.current.has(REVIEW_MILESTONES.milestone3.id)
    ) {
      setState({
        activeMilestone: REVIEW_MILESTONES.milestone3,
        isModalOpen: true,
      });
      markTriggered(
        REVIEW_MILESTONES.milestone3.id,
        REVIEW_MILESTONES.milestone3.storageKey
      );
      return;
    }
  }, [markTriggered]);

  const dismissModal = useCallback(() => {
    setState((prev) => ({ ...prev, isModalOpen: false }));
  }, []);

  const handleLeaveReview = useCallback(async () => {
    await markReviewCompleted();
    dismissModal();
  }, [markReviewCompleted, dismissModal]);

  return {
    activeMilestone: state.activeMilestone,
    isModalOpen: state.isModalOpen,
    checkMilestones,
    dismissModal,
    handleLeaveReview,
  };
}

'use client';

import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS } from '../constants';
import { settingsRepository } from '../database/repositories/settingsRepository';

async function getStoredFlag(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await settingsRepository.get(key);
    } catch {
      return null;
    }
  }
  return localStorage.getItem(key);
}

async function setStoredFlag(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await settingsRepository.set(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

/** One-time onboarding review prompt (iOS only). Safe to call on web. */
export async function requestOnboardingReview(): Promise<void> {
  const alreadyRequested = await getStoredFlag(
    STORAGE_KEYS.onboardingReviewRequested
  );
  if (alreadyRequested === 'true') return;

  if (Capacitor.getPlatform() === 'ios') {
    try {
      await InAppReview.requestReview();
    } catch (err) {
      console.warn('In-app review request failed:', err);
    }
  }

  try {
    await setStoredFlag(STORAGE_KEYS.onboardingReviewRequested, 'true');
    await setStoredFlag(STORAGE_KEYS.reviewCompleted, 'true');
  } catch (err) {
    console.warn('Failed to persist review flags:', err);
  }
}

/** Explicit user-initiated review (e.g. Settings). iOS only. */
export async function requestAppReview(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;

  try {
    await InAppReview.requestReview();
  } catch (err) {
    console.warn('In-app review request failed:', err);
  }
}

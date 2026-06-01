'use client';

import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS } from '../constants';
import { settingsRepository } from '../database/repositories/settingsRepository';

const MIN_APP_OPENS_FOR_REVIEW = 2;
const MIN_VALUE_EVENTS_FOR_REVIEW = 2;
const PAYWALL_SUPPRESSION_MS = 24 * 60 * 60 * 1000;
const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

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

async function getStoredNumber(key: string): Promise<number> {
  const value = await getStoredFlag(key);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

export async function recordReviewAppOpen(): Promise<void> {
  const today = todayKey();
  const lastOpenDate = await getStoredFlag(STORAGE_KEYS.reviewLastAppOpenDate);
  if (lastOpenDate === today) return;

  const openCount = await getStoredNumber(STORAGE_KEYS.reviewAppOpenCount);
  await setStoredFlag(STORAGE_KEYS.reviewLastAppOpenDate, today);
  await setStoredFlag(STORAGE_KEYS.reviewAppOpenCount, String(openCount + 1));
}

export async function recordReviewValueEvent(): Promise<void> {
  const valueEventCount = await getStoredNumber(STORAGE_KEYS.reviewValueEventCount);
  await setStoredFlag(
    STORAGE_KEYS.reviewValueEventCount,
    String(valueEventCount + 1),
  );
}

export async function recordPaywallDismissedForReview(): Promise<void> {
  await setStoredFlag(
    STORAGE_KEYS.reviewLastPaywallDismissedAt,
    String(Date.now()),
  );
}

export async function markReviewPromptShown(): Promise<void> {
  await setStoredFlag(STORAGE_KEYS.reviewLastPromptAt, String(Date.now()));
}

export async function markNativeReviewRequested(): Promise<void> {
  await setStoredFlag(STORAGE_KEYS.reviewNativeRequested, 'true');
}

export async function markNegativeReviewFeedback(): Promise<void> {
  await setStoredFlag(STORAGE_KEYS.reviewNegativeFeedback, 'true');
}

export async function shouldSuppressReviewPrompts(): Promise<boolean> {
  const reviewCompleted = await getStoredFlag(STORAGE_KEYS.reviewCompleted);
  const nativeRequested = await getStoredFlag(STORAGE_KEYS.reviewNativeRequested);
  const negativeFeedback = await getStoredFlag(STORAGE_KEYS.reviewNegativeFeedback);

  return (
    reviewCompleted === 'true' ||
    nativeRequested === 'true' ||
    negativeFeedback === 'true'
  );
}

export async function getReviewEligibility(options: {
  isSessionActive: boolean;
}): Promise<{
  eligible: boolean;
  appOpenCount: number;
  valueEventCount: number;
}> {
  const appOpenCount = await getStoredNumber(STORAGE_KEYS.reviewAppOpenCount);
  const valueEventCount = await getStoredNumber(STORAGE_KEYS.reviewValueEventCount);
  const now = Date.now();

  const lastPromptAt = await getStoredNumber(STORAGE_KEYS.reviewLastPromptAt);
  const lastPaywallDismissedAt = await getStoredNumber(
    STORAGE_KEYS.reviewLastPaywallDismissedAt,
  );
  const suppressPrompts = await shouldSuppressReviewPrompts();

  const eligible =
    !options.isSessionActive &&
    !suppressPrompts &&
    appOpenCount >= MIN_APP_OPENS_FOR_REVIEW &&
    valueEventCount >= MIN_VALUE_EVENTS_FOR_REVIEW &&
    (!lastPromptAt || now - lastPromptAt >= PROMPT_COOLDOWN_MS) &&
    (!lastPaywallDismissedAt ||
      now - lastPaywallDismissedAt >= PAYWALL_SUPPRESSION_MS);

  return {
    eligible,
    appOpenCount,
    valueEventCount,
  };
}

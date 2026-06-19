'use client';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS } from '../constants';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { getWhatsNewEntry, WhatsNewEntry } from '../whatsNewContent';

// Mirrors the native-vs-web flag storage used by inAppReviewService.ts:
// SQLite `settings` table on device, localStorage on web.
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

/** Current app marketing version (CFBundleShortVersionString), or null off-device. */
async function getCurrentAppVersion(): Promise<string | null> {
  try {
    const info = await App.getInfo();
    return info.version || null;
  } catch {
    // @capacitor/app not available (e.g. web fallback)
    return null;
  }
}

/**
 * Decide whether to show the "What's New" sheet on this launch.
 *
 * Rules:
 * - No version recorded yet → record current and show nothing. This skips
 *   brand-new installs (onboarding covers them) and the very first run after
 *   this feature ships.
 * - Already on the recorded version → nothing to show.
 * - Updated to a version with no curated content → record it silently.
 * - Updated to a version that HAS curated content → return that entry. We
 *   record the version only on dismiss (markWhatsNewSeen).
 */
export async function getWhatsNewToShow(): Promise<WhatsNewEntry | null> {
  const version = await getCurrentAppVersion();
  if (!version) return null;

  const lastSeen = await getStoredFlag(STORAGE_KEYS.whatsNewLastSeenVersion);

  if (lastSeen === null) {
    await setStoredFlag(STORAGE_KEYS.whatsNewLastSeenVersion, version);
    return null;
  }

  if (lastSeen === version) return null;

  const entry = getWhatsNewEntry(version);
  if (!entry) {
    // Updated, but nothing to announce — advance the marker so we stop checking.
    await setStoredFlag(STORAGE_KEYS.whatsNewLastSeenVersion, version);
    return null;
  }

  return entry;
}

/** Record that the user has seen the sheet for this version (call on dismiss). */
export async function markWhatsNewSeen(version: string): Promise<void> {
  await setStoredFlag(STORAGE_KEYS.whatsNewLastSeenVersion, version);
}

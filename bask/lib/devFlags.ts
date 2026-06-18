'use client';

import { Capacitor } from '@capacitor/core';

const FORCE_FREE_KEY = 'bask_force_free';

/**
 * Web-only dev override to preview the non-PRO (free) experience.
 *
 * Enable:  /insights?pro=free   (or run localStorage.setItem('bask_force_free', '1'))
 * Disable: /insights?pro=on     (clears the flag)
 *
 * The query param persists to localStorage so the override survives client-side
 * tab navigation. Always returns false on a real device, so native gating is
 * untouched.
 */
export function isForcedFree(): boolean {
  if (Capacitor.isNativePlatform()) return false;
  try {
    const pro = new URLSearchParams(window.location.search).get('pro');
    if (pro === 'free') {
      localStorage.setItem(FORCE_FREE_KEY, '1');
      return true;
    }
    if (pro === 'on' || pro === 'clear') {
      localStorage.removeItem(FORCE_FREE_KEY);
      return false;
    }
    return localStorage.getItem(FORCE_FREE_KEY) === '1';
  } catch {
    return false;
  }
}

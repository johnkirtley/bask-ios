'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { OnboardingState, OnboardingAnswers } from '../types';
import { STORAGE_KEYS } from '../lib/constants';
import { databaseService, runMigrations } from '../lib/database';

const DEFAULT_ONBOARDING: OnboardingState = {
  isComplete: false,
  completedAt: null,
  agreedToTermsAt: null,
  answers: {
    interest: [],
  },
  paywallShown: false,
};

// Validate that parsed data matches expected structure
function isValidOnboardingState(obj: unknown): obj is OnboardingState {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.isComplete === 'boolean' &&
    (o.completedAt === null || typeof o.completedAt === 'string') &&
    (o.agreedToTermsAt === null || typeof o.agreedToTermsAt === 'string') &&
    typeof o.answers === 'object' &&
    o.answers !== null
  );
}

// Load onboarding state from localStorage
function loadFromLocalStorage(): OnboardingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.onboarding);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidOnboardingState(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load onboarding state from localStorage:', e);
  }
  return DEFAULT_ONBOARDING;
}

// Save onboarding state to localStorage
function saveToLocalStorage(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save onboarding state to localStorage:', e);
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // Initialize and load data
  useEffect(() => {
    async function initAndLoad() {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native: Initialize SQLite
          await databaseService.initialize();
          await runMigrations();

          // Load from SQLite settings table
          try {
            const db = await databaseService.getConnection();
            const result = await db.query(
              `SELECT value FROM settings WHERE key = ?`,
              [STORAGE_KEYS.onboarding]
            );
            if (result.values && result.values.length > 0) {
              const row = result.values[0];
              if (row && typeof row.value === 'string') {
                const parsed = JSON.parse(row.value);
                if (isValidOnboardingState(parsed)) {
                  setState(parsed);
                  setDbReady(true);
                  setIsLoaded(true);
                  return;
                }
              }
            }
          } catch (queryError) {
            console.warn('Failed to query onboarding from SQLite:', queryError);
          }
          setDbReady(true);
        }

        // Web fallback or if SQLite query failed
        const data = loadFromLocalStorage();
        setState(data);
      } catch (error) {
        console.error('Failed to initialize onboarding:', error);
        // Fallback to localStorage on error
        const data = loadFromLocalStorage();
        setState(data);
      }
      setIsLoaded(true);
    }

    initAndLoad();
  }, []);

  // Persist to localStorage when state changes (backup for native, primary for web)
  useEffect(() => {
    if (!isLoaded) return;
    saveToLocalStorage(state);
  }, [state, isLoaded]);

  // Complete onboarding with answers
  const completeOnboarding = useCallback(
    async (answers: OnboardingAnswers) => {
      const now = new Date().toISOString();
      const newState: OnboardingState = {
        isComplete: true,
        completedAt: now,
        agreedToTermsAt: now,
        answers,
        paywallShown: false,
      };

      // Save to localStorage immediately as backup
      saveToLocalStorage(newState);

      // Persist to SQLite
      if (Capacitor.isNativePlatform() && dbReady) {
        try {
          const db = await databaseService.getConnection();
          await db.run(
            `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
            [STORAGE_KEYS.onboarding, JSON.stringify(newState), now]
          );
        } catch (err) {
          console.error('Failed to persist onboarding to SQLite:', err);
          // localStorage already has the backup, so continue
        }
      }

      // Update React state
      setState(newState);
    },
    [dbReady]
  );

  // Reset onboarding (for testing or re-do from settings)
  const resetOnboarding = useCallback(async () => {
    if (Capacitor.isNativePlatform() && dbReady) {
      try {
        const db = await databaseService.getConnection();
        await db.run(`DELETE FROM settings WHERE key = ?`, [
          STORAGE_KEYS.onboarding,
        ]);
      } catch (err) {
        console.error('Failed to reset onboarding in database:', err);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.onboarding);
    setState(DEFAULT_ONBOARDING);
  }, [dbReady]);

  return {
    isComplete: state.isComplete,
    isLoaded,
    answers: state.answers,
    completeOnboarding,
    resetOnboarding,
  };
}

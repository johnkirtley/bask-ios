'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { OnboardingState, OnboardingAnswers } from '../types';
import { STORAGE_KEYS } from '../lib/constants';
import { databaseService, runMigrations } from '../lib/database';

const DEFAULT_ONBOARDING: OnboardingState = {
  isComplete: false,
  completedAt: null,
  agreedToTermsAt: null,
  answers: {
    primaryGoal: null,
    skinTone: null,
    eyeColor: null,
    sunReaction: null,
    outdoorTime: null,
    vitaminDSupplementation: null,
    typicalAttire: null,
    age: null,
    weight: null,
    weightUnit: 'lbs',
    medicalDisclaimerAccepted: false,
    locationPermissionGranted: false,
    hasBloodTest: false,
    bloodTestValue: null,
    bloodTestUnit: 'ng/mL',
    bloodTestDate: null,
  },
  paywallShown: false,
};

interface OnboardingContextType {
  isComplete: boolean;
  isLoaded: boolean;
  paywallShown: boolean;
  answers: OnboardingAnswers;
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  markPaywallShown: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

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

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // Initialize and load data
  useEffect(() => {
    async function initAndLoad() {
      try {
        if (Capacitor.isNativePlatform()) {
          await databaseService.initialize();
          await runMigrations();

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

        const data = loadFromLocalStorage();
        setState(data);
      } catch (error) {
        console.error('Failed to initialize onboarding:', error);
        const data = loadFromLocalStorage();
        setState(data);
      }
      setIsLoaded(true);
    }

    initAndLoad();
  }, []);

  // Persist to localStorage when state changes
  useEffect(() => {
    if (!isLoaded) return;
    saveToLocalStorage(state);
  }, [state, isLoaded]);

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

      saveToLocalStorage(newState);

      if (Capacitor.isNativePlatform() && dbReady) {
        try {
          const db = await databaseService.getConnection();
          await db.run(
            `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
            [STORAGE_KEYS.onboarding, JSON.stringify(newState), now]
          );
        } catch (err) {
          console.error('Failed to persist onboarding to SQLite:', err);
        }
      }

      setState(newState);
    },
    [dbReady]
  );

  const markPaywallShown = useCallback(async () => {
    const newState: OnboardingState = {
      ...state,
      paywallShown: true,
    };

    saveToLocalStorage(newState);

    if (Capacitor.isNativePlatform() && dbReady) {
      try {
        const db = await databaseService.getConnection();
        const now = new Date().toISOString();
        await db.run(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          [STORAGE_KEYS.onboarding, JSON.stringify(newState), now]
        );
      } catch (err) {
        console.error('Failed to persist paywallShown to SQLite:', err);
      }
    }

    setState(newState);
  }, [state, dbReady]);

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

  return (
    <OnboardingContext.Provider
      value={{
        isComplete: state.isComplete,
        isLoaded,
        paywallShown: state.paywallShown,
        answers: state.answers,
        completeOnboarding,
        markPaywallShown,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

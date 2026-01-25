'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdOptions,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { ADMOB_CONFIG } from '../lib/constants';

interface UseInterstitialAdReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  prepareAd: () => Promise<void>;
  showAd: () => Promise<boolean>;
}

export function useInterstitialAd(): UseInterstitialAdReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const listenersRef = useRef<{
    load?: PluginListenerHandle;
    fail?: PluginListenerHandle;
  }>({});

  const getAdId = (): string => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return ADMOB_CONFIG.interstitialId.ios;
    } else if (platform === 'android') {
      return ADMOB_CONFIG.interstitialId.android;
    }
    return 'ca-app-pub-3940256099942544/1033173712'; // Google test ad for web
  };

  const cleanupListeners = useCallback(() => {
    listenersRef.current.load?.remove();
    listenersRef.current.fail?.remove();
    listenersRef.current = {};
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const initializeAdMob = async (): Promise<void> => {
    if (initializedRef.current) return;

    // Return existing promise if initialization in progress
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    initPromiseRef.current = (async () => {
      try {
        await AdMob.initialize();
        initializedRef.current = true;
      } catch (err) {
        initPromiseRef.current = null;
        throw err;
      }
    })();

    return initPromiseRef.current;
  };

  const prepareAd = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Clean up any existing listeners
    cleanupListeners();

    setIsLoading(true);
    setError(null);

    try {
      await initializeAdMob();

      const options: AdOptions = {
        adId: getAdId(),
        isTesting: process.env.NODE_ENV === 'development',
      };

      listenersRef.current.load = await AdMob.addListener(
        InterstitialAdPluginEvents.Loaded,
        () => {
          setIsLoaded(true);
          setIsLoading(false);
          cleanupListeners();
        }
      );

      listenersRef.current.fail = await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToLoad,
        () => {
          setError('Failed to load ad');
          setIsLoading(false);
          cleanupListeners();
        }
      );

      await AdMob.prepareInterstitial(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      cleanupListeners();
    }
  }, [cleanupListeners]);

  const showAd = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    if (!isLoaded) {
      return false;
    }

    try {
      let dismissListener: PluginListenerHandle | null = null;

      const dismissPromise = new Promise<void>((resolve) => {
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          dismissListener?.remove();
          resolve();
        }).then((listener) => {
          dismissListener = listener;
        });
      });

      await AdMob.showInterstitial();
      await dismissPromise;

      setIsLoaded(false);
      return true;
    } catch {
      setIsLoaded(false);
      return false;
    }
  }, [isLoaded]);

  return {
    isLoaded,
    isLoading,
    error,
    prepareAd,
    showAd,
  };
}

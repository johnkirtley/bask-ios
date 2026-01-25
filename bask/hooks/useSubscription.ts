'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';
import { REVENUECAT_API_KEY, ENTITLEMENTS } from '../lib/constants';

// Check if user has premium entitlement (outside hook for use in listener)
function checkPremiumStatus(info: CustomerInfo): boolean {
  const entitlements = info.entitlements.active;
  return (
    ENTITLEMENTS.monthly in entitlements ||
    ENTITLEMENTS.yearly in entitlements ||
    ENTITLEMENTS.lifetime in entitlements
  );
}

interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesPackage[];
  error: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isInitialized: false,
    isLoading: true,
    isPremium: false,
    customerInfo: null,
    offerings: [],
    error: null,
  });

  // Initialize RevenueCat
  useEffect(() => {
    let listenerId: string | null = null;

    async function init() {
      // Skip RevenueCat on web (for development)
      if (!Capacitor.isNativePlatform()) {
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
        }));
        return;
      }

      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        // Listen for subscription status changes (cancellation, expiration, renewal)
        listenerId = await Purchases.addCustomerInfoUpdateListener(
          (info: CustomerInfo) => {
            const isPremium = checkPremiumStatus(info);
            setState((prev) => ({
              ...prev,
              isPremium,
              customerInfo: info,
            }));
          }
        );

        const { customerInfo } = await Purchases.getCustomerInfo();
        const offerings = await Purchases.getOfferings();

        const isPremium = checkPremiumStatus(customerInfo);

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          isPremium,
          customerInfo,
          offerings: offerings.current?.availablePackages || [],
        }));
      } catch (error) {
        console.error('RevenueCat init error:', error);
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: 'Failed to initialize subscriptions',
        }));
      }
    }

    init();

    // Cleanup listener on unmount
    return () => {
      if (listenerId) {
        Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerId });
      }
    };
  }, []);

  // Purchase a package
  const purchase = useCallback(
    async (packageToPurchase: PurchasesPackage): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const { customerInfo } = await Purchases.purchasePackage({
          aPackage: packageToPurchase,
        });
        const isPremium = checkPremiumStatus(customerInfo);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPremium,
          customerInfo,
        }));

        return isPremium;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Purchase failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    []
  );

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPremium = checkPremiumStatus(customerInfo);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPremium,
        customerInfo,
      }));

      return isPremium;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Restore failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Present RevenueCat templated paywall
  const presentPaywall = useCallback(async (): Promise<boolean> => {
    // Skip on web (for development)
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    // If already premium, no need to show paywall
    if (state.isPremium) {
      return true;
    }

    try {
      const { result } = await RevenueCatUI.presentPaywall();

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        // Refresh customer info after purchase/restore
        try {
          const { customerInfo } = await Purchases.getCustomerInfo();
          const isPremium = checkPremiumStatus(customerInfo);
          setState((prev) => ({ ...prev, isPremium, customerInfo }));
        } catch {
          // Purchase succeeded, set premium even if info refresh fails
          setState((prev) => ({ ...prev, isPremium: true }));
        }
        return true;
      }

      // CANCELLED or ERROR
      return false;
    } catch (error) {
      console.error('Paywall error:', error);
      return false;
    }
  }, [state.isPremium]);

  // Check if user can access a program tier
  const canAccess = useCallback(
    (requiredTier: 'free' | 'premium'): boolean => {
      if (requiredTier === 'free') return true;
      return state.isPremium;
    },
    [state.isPremium]
  );

  return {
    ...state,
    purchase,
    restore,
    canAccess,
    presentPaywall,
  };
}

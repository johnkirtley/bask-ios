'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import {
  RevenueCatUI,
  PAYWALL_RESULT,
} from '@revenuecat/purchases-capacitor-ui';
import { REVENUECAT_API_KEY, ENTITLEMENTS } from '../lib/constants';

function checkPremiumStatus(info: CustomerInfo): boolean {
  return ENTITLEMENTS.pro in info.entitlements.active;
}

interface SubscriptionContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesPackage[];
  error: string | null;
  purchase: (packageToPurchase: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  canAccess: (requiredTier: 'free' | 'premium') => boolean;
  presentPaywall: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState({
    isInitialized: false,
    isLoading: true,
    isPremium: false,
    customerInfo: null as CustomerInfo | null,
    offerings: [] as PurchasesPackage[],
    error: null as string | null,
  });

  useEffect(() => {
    let listenerId: string | null = null;

    async function init() {
      if (!Capacitor.isNativePlatform()) {
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
        }));
        return;
      }

      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        listenerId = await Purchases.addCustomerInfoUpdateListener(
          (info: CustomerInfo) => {
            const isPremium = checkPremiumStatus(info);
            setState((prev) => ({
              ...prev,
              isPremium,
              customerInfo: info,
            }));
          },
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

    return () => {
      if (listenerId) {
        Purchases.removeCustomerInfoUpdateListener({
          listenerToRemove: listenerId,
        });
      }
    };
  }, []);

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
    [],
  );

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

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    if (state.isPremium) {
      return true;
    }

    try {
      const { result } = await RevenueCatUI.presentPaywall();

      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        try {
          const { customerInfo } = await Purchases.getCustomerInfo();
          const isPremium = checkPremiumStatus(customerInfo);
          setState((prev) => ({ ...prev, isPremium, customerInfo }));
        } catch {
          setState((prev) => ({ ...prev, isPremium: true }));
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Paywall error:', error);
      return false;
    }
  }, [state.isPremium]);

  const canAccess = useCallback(
    (requiredTier: 'free' | 'premium'): boolean => {
      if (requiredTier === 'free') return true;
      return state.isPremium;
    },
    [state.isPremium],
  );

  const value = useMemo(
    () => ({
      ...state,
      purchase,
      restore,
      canAccess,
      presentPaywall,
    }),
    [state, purchase, restore, canAccess, presentPaywall],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

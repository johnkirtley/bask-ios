'use client';

import { useState, useEffect, useRef } from 'react';
import { setupIonicReact, IonApp } from '@ionic/react';
import { ModalProvider } from '../contexts/ModalContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { OnboardingProvider, useOnboardingContext } from '../contexts/OnboardingContext';
import { useSubscription } from '../hooks/useSubscription';
import OnboardingFlow from './onboarding/OnboardingFlow';

// Initialize Ionic React with iOS mode
setupIonicReact({
  mode: 'ios', // Use iOS styling since this is primarily an iOS app
});

interface IonicProviderProps {
  children: React.ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-light-bg flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-black/10 border-t-solar-flare rounded-full animate-spin" />
    </div>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isComplete, isLoaded, paywallShown, markPaywallShown } = useOnboardingContext();
  const { presentPaywall, isInitialized: subscriptionInitialized } = useSubscription();

  // Track if we're currently showing the paywall
  const [isShowingPaywall, setIsShowingPaywall] = useState(false);

  // Ref to prevent double-triggering paywall
  const paywallTriggered = useRef(false);

  // Effect to show paywall after onboarding completes
  useEffect(() => {
    async function showPostOnboardingPaywall() {
      // Guard conditions - all must be true to show paywall
      if (!isLoaded) return;                    // Wait for onboarding state to load
      if (!isComplete) return;                  // Onboarding must be complete
      if (paywallShown) return;                 // Paywall must not have been shown before
      if (!subscriptionInitialized) return;     // RevenueCat must be initialized
      if (paywallTriggered.current) return;     // Prevent double-trigger

      // Mark as triggered to prevent race conditions
      paywallTriggered.current = true;
      setIsShowingPaywall(true);

      try {
        // presentPaywall is async and returns when user dismisses
        await presentPaywall();
      } catch {
        // Paywall presentation failed silently
      } finally {
        // Mark paywall as shown regardless of purchase result
        await markPaywallShown();
        setIsShowingPaywall(false);
      }
    }

    showPostOnboardingPaywall();
  }, [isLoaded, isComplete, paywallShown, subscriptionInitialized, presentPaywall, markPaywallShown]);

  // Show loading while:
  // 1. Onboarding state is loading
  // 2. Paywall is being displayed (keeps spinner visible behind native modal)
  if (!isLoaded || isShowingPaywall) {
    return <LoadingSpinner />;
  }

  // Show onboarding if not complete
  if (!isComplete) {
    return <OnboardingFlow />;
  }

  // Show app content
  return <>{children}</>;
}

export default function IonicProvider({ children }: IonicProviderProps) {
  return (
    <IonApp>
      <SubscriptionProvider>
        <OnboardingProvider>
          <ModalProvider>
            <OnboardingGate>{children}</OnboardingGate>
          </ModalProvider>
        </OnboardingProvider>
      </SubscriptionProvider>
    </IonApp>
  );
}

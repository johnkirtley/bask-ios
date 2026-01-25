'use client';

import { useState } from 'react';
import { IonAlert } from '@ionic/react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '../../hooks/useSubscription';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { legalContent } from '../../lib/onboardingData';
import { FEEDBACK_EMAIL } from '../../lib/constants';

// Icon components
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M1 4v6h6M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

const EnvelopeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const LightbulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" />
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function SettingsPage() {
  const { isPremium, restore, isLoading, presentPaywall } = useSubscription();
  const { resetOnboarding } = useOnboardingContext();
  const [showOnboardingResetConfirm, setShowOnboardingResetConfirm] = useState(false);

  const handleRestore = async () => {
    const restored = await restore();
    if (restored) {
      alert('Purchases restored successfully!');
    } else {
      alert('No purchases to restore.');
    }
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    setShowOnboardingResetConfirm(false);
  };

  const handleOpenLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleReportIssue = () => {
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('App Feedback')}`;
  };

  const handleSuggestFeature = () => {
    // Customize this link to your feature request platform
    handleOpenLink('https://example.com/feature-requests');
  };

  const handleRateApp = () => {
    // Customize this link to your App Store page
    handleOpenLink('https://apps.apple.com/us/app/your-app-id');
  };

  return (
    <div className="min-h-screen bg-limestone pb-20">
      {/* Header */}
      <div className="px-6 pb-4 pt-safe">
        <h1 className="text-3xl font-title text-umber">Settings</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Subscription Section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-umber-muted uppercase tracking-wide mb-3 px-1">
            Subscription
          </h2>

          {/* Premium Status */}
          {isPremium ? (
            <div className="rounded-2xl p-4 bg-gradient-to-br from-sage/40 to-olive/30 border border-sage/40 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-amber text-2xl">★</span>
                <div>
                  <p className="font-semibold text-umber">Premium</p>
                  <p className="text-sm text-umber-muted">Active</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-oat border border-border-warm rounded-xl overflow-hidden mb-3">
              <button
                onClick={() => presentPaywall()}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-clay/10 border border-clay/30 rounded-full flex items-center justify-center text-clay">
                    <StarIcon />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-umber">Upgrade to Premium</p>
                    <p className="text-sm text-umber-muted">
                      Unlock all programs & remove ads
                    </p>
                  </div>
                </div>
                <span className="text-umber/40"><ChevronRightIcon /></span>
              </button>
            </div>
          )}

          {/* Restore Purchases */}
          <div className="bg-oat border border-border-warm rounded-xl overflow-hidden">
            <button
              onClick={handleRestore}
              disabled={isLoading}
              className="w-full p-4 flex items-center gap-3 text-left disabled:opacity-50"
            >
              <span className="text-umber-muted"><StarIcon /></span>
              <span className="flex-1 text-umber">Restore Purchases</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
          </div>
        </section>

        {/* Support Section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-umber-muted uppercase tracking-wide mb-3 px-1">
            Support
          </h2>
          <div className="bg-oat border border-border-warm rounded-xl overflow-hidden">
            <button
              onClick={handleSuggestFeature}
              className="w-full p-4 flex items-center gap-3 text-left border-b border-border-warm"
            >
              <span className="text-umber-muted"><LightbulbIcon /></span>
              <span className="flex-1 text-umber">Suggest a Feature</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
            <button
              onClick={handleReportIssue}
              className="w-full p-4 flex items-center gap-3 text-left border-b border-border-warm"
            >
              <span className="text-umber-muted"><EnvelopeIcon /></span>
              <span className="flex-1 text-umber">Report an Issue</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
            <button
              onClick={handleRateApp}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="text-umber-muted"><HeartIcon /></span>
              <span className="flex-1 text-umber">Rate the App</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
          </div>
        </section>

        {/* Legal Section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-umber-muted uppercase tracking-wide mb-3 px-1">
            Legal
          </h2>
          <div className="bg-oat border border-border-warm rounded-xl overflow-hidden">
            <button
              onClick={() => handleOpenLink(legalContent.links.privacyPolicy)}
              className="w-full p-4 flex items-center gap-3 text-left border-b border-border-warm"
            >
              <span className="text-umber-muted"><ShieldIcon /></span>
              <span className="flex-1 text-umber">Privacy Policy</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
            <button
              onClick={() => handleOpenLink(legalContent.links.termsOfService)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="text-umber-muted"><DocumentIcon /></span>
              <span className="flex-1 text-umber">Terms of Service</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-umber-muted uppercase tracking-wide mb-3 px-1">
            Danger Zone
          </h2>
          <div className="bg-oat border border-border-warm rounded-xl overflow-hidden">
            <button
              onClick={() => setShowOnboardingResetConfirm(true)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="text-clay"><RefreshIcon /></span>
              <span className="flex-1 text-clay">Redo Onboarding</span>
              <span className="text-umber/40"><ChevronRightIcon /></span>
            </button>
          </div>
        </section>

        {/* Version Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-umber-muted">Version 1.0.0</p>
        </div>
      </div>

      {/* Scroll fade overlay */}
      <div className='scroll-fade-bottom' />

      {/* Redo Onboarding Confirmation Alert */}
      <IonAlert
        isOpen={showOnboardingResetConfirm}
        onDidDismiss={() => setShowOnboardingResetConfirm(false)}
        header="Redo Onboarding?"
        message="This will reset your onboarding answers and show the welcome screen again."
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Redo',
            role: 'destructive',
            handler: handleResetOnboarding
          }
        ]}
      />
    </div>
  );
}

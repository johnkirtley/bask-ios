'use client';

import { useState, useEffect } from 'react';
import { IonAlert, IonToggle, IonToast, IonModal } from '@ionic/react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '../../hooks/useSubscription';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { legalContent } from '../../lib/onboardingData';
import { FEEDBACK_EMAIL } from '../../lib/constants';
import { BaskWeather } from '../../lib/plugins';
import packageJson from '../../package.json';
import { normalizeToNgMl } from '../../lib/bloodTestUtils';
import {
  notificationService,
  NotificationSettings,
} from '../../lib/services/notificationService';
import { requestAppReview } from '../../lib/services/inAppReviewService';
import AtmosphericBackground from '../../components/home/AtmosphericBackground';
// import ExportPhysicianReport from '../../components/settings/ExportPhysicianReport';
import { resetRepository } from '../../lib/database/repositories/resetRepository';
import ProBadge from '../../components/ui/ProBadge';
import ScienceFAQ from '../../components/settings/ScienceFAQ';
import BloodTestModal from '../../components/settings/BloodTestModal';
import { userProfileRepository } from '../../lib/database/repositories/userProfileRepository';

// Icon components
const ChevronRightIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='w-5 h-5'>
    <path
      fillRule='evenodd'
      d='M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z'
      clipRule='evenodd'
    />
  </svg>
);

const StarIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='w-5 h-5'>
    <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' />
    <path d='M10 11v6M14 11v6' />
  </svg>
);

const DocumentIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
    <polyline points='14,2 14,8 20,8' />
    <line x1='16' y1='13' x2='8' y2='13' />
    <line x1='16' y1='17' x2='8' y2='17' />
    <polyline points='10,9 9,9 8,9' />
  </svg>
);

const ShieldIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
  </svg>
);

const RefreshIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M1 4v6h6M23 20v-6h-6' />
    <path d='M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15' />
  </svg>
);

const EnvelopeIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <rect x='2' y='4' width='20' height='16' rx='2' />
    <path d='M22 6l-10 7L2 6' />
  </svg>
);

const LightbulbIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z' />
  </svg>
);

const HeartIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
  </svg>
);

const LocationIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' />
    <circle cx='12' cy='10' r='3' />
  </svg>
);

const BellIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
    <path d='M13.73 21a2 2 0 0 1-3.46 0' />
  </svg>
);

const BeakerIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M9 3h6M9 3v9l-5 7a2 2 0 0 0 1.6 3.2h12.8a2 2 0 0 0 1.6-3.2l-5-7V3' />
    <path d='M14 14h.01' />
  </svg>
);

export default function SettingsPage() {
  const { isPremium, restore, isLoading, presentPaywall } = useSubscription();
  const { resetOnboarding } = useOnboardingContext();
  const [showOnboardingResetConfirm, setShowOnboardingResetConfirm] =
    useState(false);
  const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      enabled: false,
      leadTimeMinutes: 20,
    });
  const [notificationPermission, setNotificationPermission] =
    useState<boolean>(false);
  const [healthKitEnabled, setHealthKitEnabled] = useState<boolean>(false);
  const [showHealthKitError, setShowHealthKitError] = useState(false);
  const [healthKitErrorMessage, setHealthKitErrorMessage] =
    useState<string>('');
  const [showRestoreSuccessAlert, setShowRestoreSuccessAlert] =
    useState(false);
  const [showRestoreEmptyAlert, setShowRestoreEmptyAlert] = useState(false);
  const [showDeleteErrorAlert, setShowDeleteErrorAlert] = useState(false);
  const [showMedicalDisclaimer, setShowMedicalDisclaimer] = useState(false);
  const [showScienceFAQ, setShowScienceFAQ] = useState(false);
  const [showBloodTestModal, setShowBloodTestModal] = useState(false);
  const [bloodTestValue, setBloodTestValue] = useState<number | null>(null);
  const [bloodTestUnit, setBloodTestUnit] = useState<'ng/mL' | 'nmol/L'>('ng/mL');
  const [bloodTestDate, setBloodTestDate] = useState<string | null>(null);

  const disclaimerPoints = [
    'This app is for informational and educational purposes only. It is not a medical device.',
    'Always consult your physician before starting or changing a supplement regimen.',
    'Vitamin D recommendations provided by this app are estimates based on general research and should not replace professional medical advice.',
    'Individual vitamin D needs vary based on age, health conditions, medications, and other factors only your healthcare provider can assess.',
  ];

  // Load notification and HealthKit settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (Capacitor.isNativePlatform()) {
        const settings = await notificationService.getSettings();
        const permission = await notificationService.checkPermission();
        setNotificationSettings(settings);
        setNotificationPermission(permission);

        // Load HealthKit enabled state from settings
        const { databaseService } = await import(
          '../../lib/database/connection'
        );
        const db = await databaseService.getConnection();
        const result = await db.query(
          "SELECT value FROM settings WHERE key = 'healthkit_enabled'",
          [],
        );
        if (result.values && result.values.length > 0) {
          setHealthKitEnabled(result.values[0].value === 'true');
        }
      }

      // Load blood test data
      const profile = await userProfileRepository.get();
      if (profile) {
        setBloodTestValue(profile.blood_test_value || null);
        setBloodTestUnit((profile.blood_test_unit as 'ng/mL' | 'nmol/L') || 'ng/mL');
        setBloodTestDate(profile.blood_test_date || null);
      }
    }
    loadSettings();
  }, []);

  const handleRestore = async () => {
    const restored = await restore();
    if (restored) {
      setShowRestoreSuccessAlert(true);
    } else {
      setShowRestoreEmptyAlert(true);
    }
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    setShowOnboardingResetConfirm(false);
  };

  const handleDeleteAllData = async () => {
    try {
      await resetRepository.deleteAllUserData();
      resetOnboarding(); // Reset in-memory onboarding state
      setShowDeleteDataConfirm(false);
      // Redirect to onboarding flow
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete user data:', error);
      setShowDeleteDataConfirm(false);
      setShowDeleteErrorAlert(true);
    }
  };

  const handleOpenLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleReportIssue = () => {
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      'App Feedback',
    )}`;
  };

  const handleSuggestFeature = () => {
    // Customize this link to your feature request platform
    handleOpenLink('https://www.bask.io/feature-requests');
  };

  const handleRateApp = async () => {
    if (Capacitor.getPlatform() === 'ios') {
      await requestAppReview();
      return;
    }
    handleOpenLink('https://apps.apple.com/us/app/bask-app-id');
  };

  const handleOpenAppSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await BaskWeather.openSettings();
      } catch (error) {
        console.warn('Failed to open settings:', error);
      }
    }
  };

  const handleToggleNotifications = async () => {
    // Gate for non-premium users
    if (!isPremium) {
      await presentPaywall();
      return;
    }

    if (!notificationPermission) {
      const granted = await notificationService.requestPermission();
      setNotificationPermission(granted);
      if (!granted) return;
    }

    const newSettings = {
      ...notificationSettings,
      enabled: !notificationSettings.enabled,
    };
    await notificationService.saveSettings(newSettings);
    setNotificationSettings(newSettings);
    await notificationService.applySettingsChange();
  };

  const handleLeadTimeChange = async (minutes: number) => {
    const newSettings = {
      ...notificationSettings,
      leadTimeMinutes: minutes,
    };
    await notificationService.saveSettings(newSettings);
    setNotificationSettings(newSettings);
    await notificationService.applySettingsChange();
  };

  const handleToggleHealthKit = async () => {
    const newValue = !healthKitEnabled;
    setHealthKitEnabled(newValue);

    // Save to settings table
    const { databaseService } = await import('../../lib/database/connection');
    const db = await databaseService.getConnection();
    await db.run(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES ('healthkit_enabled', ?, datetime('now'))`,
      [newValue ? 'true' : 'false'],
    );

    // If enabling for the first time, request authorization
    if (newValue && Capacitor.getPlatform() === 'ios') {
      try {
        const { BaskHealth } = await import('../../lib/plugins/baskHealth');
        await BaskHealth.requestAuthorization();
      } catch (error: any) {
        console.warn('Failed to request HealthKit authorization:', error);
        setHealthKitErrorMessage(
          error?.message || 'Failed to request HealthKit authorization',
        );
        setShowHealthKitError(true);
      }
    }
  };

  const handleSaveBloodTest = async (data: {
    bloodTestValue: number;
    bloodTestUnit: 'ng/mL' | 'nmol/L';
    bloodTestDate: string;
  }) => {
    await userProfileRepository.update({
      blood_test_value: data.bloodTestValue,
      blood_test_unit: data.bloodTestUnit,
      blood_test_date: data.bloodTestDate,
      blood_test_source: 'manual',
    });

    setBloodTestValue(data.bloodTestValue);
    setBloodTestUnit(data.bloodTestUnit);
    setBloodTestDate(data.bloodTestDate);
  };

  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-3xl font-semibold text-text-primary'>Settings</h1>
        </div>

        {/* Content */}
        <div className='px-6'>
          {/* Subscription Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Subscription
            </h2>

            {/* Premium Status */}
            {isPremium ? (
              <div className='rounded-2xl p-4 bg-gradient-to-br from-solar-flare/15 to-solar-warm/10 border border-solar-flare/30 backdrop-blur-xl shadow-sm mb-3'>
                <div className='flex items-center gap-3'>
                  <span className='text-solar-flare text-2xl'>★</span>
                  <div>
                    <p className='font-semibold text-text-primary'>Premium</p>
                    <p className='text-sm text-text-secondary'>Active</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden mb-3'>
                <button
                  onClick={() => presentPaywall()}
                  className='w-full p-4 flex items-center justify-between active:scale-[0.98] transition-all'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-solar-flare/15 rounded-full flex items-center justify-center text-solar-flare'>
                      <StarIcon />
                    </div>
                    <div className='text-left'>
                      <p className='font-semibold text-text-primary'>
                        Upgrade to Premium
                      </p>
                      <p className='text-sm text-text-secondary'>
                        Unlock all features and support development
                      </p>
                    </div>
                  </div>
                  <span className='text-text-primary/40'>
                    <ChevronRightIcon />
                  </span>
                </button>
              </div>
            )}

            {/* Restore Purchases */}
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <button
                onClick={handleRestore}
                disabled={isLoading}
                className='w-full p-4 flex items-center gap-3 text-left disabled:opacity-50 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <StarIcon />
                </span>
                <span className='flex-1 text-text-primary'>
                  Restore Purchases
                </span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          </section>

          {/* Permissions Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Permissions
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              {/* Location */}
              <button
                onClick={handleOpenAppSettings}
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <LocationIcon />
                </span>
                <div className='flex-1'>
                  <span className='text-text-primary'>Location</span>
                  <p className='text-xs text-text-secondary'>
                    Required for UV and weather data
                  </p>
                </div>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
              {/* HealthKit Toggle */}
              <div
                className={`p-4 flex items-center justify-between ${!isPremium ? 'cursor-pointer active:bg-black/5 transition-colors' : ''}`}
                onClick={!isPremium ? async () => await presentPaywall() : undefined}>
                <div className='flex items-center gap-3'>
                  <span className='text-text-secondary'>
                    <HeartIcon />
                  </span>
                  <div className='flex-1'>
                    <span className='text-text-primary'>Apple Health</span>
                    <p className='text-xs text-text-secondary'>
                      Time in Daylight and Vitamin D sync
                    </p>
                  </div>
                </div>
                {isPremium ? (
                  <IonToggle
                    checked={healthKitEnabled}
                    onIonChange={handleToggleHealthKit}
                  />
                ) : (
                  <ProBadge />
                )}
              </div>
            </div>
          </section>

          {/* Biomarkers Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Biomarkers
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <div className='p-4 flex items-center justify-between'>
                <div className='flex items-center gap-3 flex-1'>
                  <span className='text-2xl'>💉</span>
                  <div className='flex-1'>
                    <span className='text-text-primary font-medium block'>
                      Vitamin D (25-OH)
                    </span>
                    {bloodTestValue ? (
                      <p className='text-sm text-text-secondary'>
                        {bloodTestValue} {bloodTestUnit}
                        {bloodTestUnit === 'nmol/L' && (
                          <> ({normalizeToNgMl(bloodTestValue, 'nmol/L')} ng/mL)</>
                        )}
                        {bloodTestDate && ` • ${new Date(bloodTestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    ) : (
                      <p className='text-sm text-text-secondary'>Not set</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowBloodTestModal(true)}
                  className='px-4 py-2 rounded-lg bg-black/5 text-text-primary text-sm font-medium hover:bg-black/10 transition-colors active:scale-[0.98]'>
                  {bloodTestValue ? 'Edit' : 'Add'}
                </button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Notifications
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              {/* D-Window Alerts Toggle */}
              <div
                className={`p-4 flex items-center justify-between border-b border-black/5 ${!isPremium ? 'cursor-pointer active:bg-black/5 transition-colors' : ''}`}
                onClick={!isPremium ? async () => await presentPaywall() : undefined}>
                <div className='flex items-center gap-3'>
                  <span className='text-text-secondary'>
                    <BellIcon />
                  </span>
                  <div>
                    <span className='text-text-primary'>
                      Optimal Vitamin D Alerts
                    </span>
                    <p className='text-xs text-text-secondary'>
                      Get notified before optimal vitamin D windows
                    </p>
                  </div>
                </div>
                {isPremium ? (
                  <IonToggle
                    checked={notificationSettings.enabled}
                    onIonChange={handleToggleNotifications}
                  />
                ) : (
                  <ProBadge />
                )}
              </div>

              {/* Lead Time Selector (only show if enabled and premium) */}
              {notificationSettings.enabled && isPremium && (
                <div className='p-4 border-b border-black/5'>
                  <p className='text-xs text-text-secondary mb-3'>
                    Alert me before window starts:
                  </p>
                  <div className='flex gap-2'>
                    {[10, 20, 30].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => handleLeadTimeChange(minutes)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          notificationSettings.leadTimeMinutes === minutes
                            ? 'bg-solar-flare text-white'
                            : 'bg-black/5 text-text-secondary'
                        }`}>
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Your Data Section */}
          {/* <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Your Data
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <ExportPhysicianReport />
            </div>
          </section> */}

          {/* Support Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Support
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              {/* <button
                onClick={handleSuggestFeature}
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <LightbulbIcon />
                </span>
                <span className='flex-1 text-text-primary'>
                  Suggest a Feature
                </span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button> */}
              <button
                onClick={handleReportIssue}
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <EnvelopeIcon />
                </span>
                <span className='flex-1 text-text-primary'>
                  Report an Issue
                </span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
              {/* <button
                onClick={handleRateApp}
                className='w-full p-4 flex items-center gap-3 text-left active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <HeartIcon />
                </span>
                <span className='flex-1 text-text-primary'>Rate the App</span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button> */}
            </div>
          </section>

          {/* Science Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Science
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <div className='p-4 border-b border-black/5'>
                <p className='text-sm font-medium text-text-primary mb-2'>
                  Where calculations happen
                </p>
                <ul className='text-xs text-text-secondary space-y-2 list-disc pl-5'>
                  <li>All vitamin D calculations run on your device.</li>
                  <li>Weather/UV data comes from Apple WeatherKit.</li>
                  <li>
                    If Apple Health is enabled, we write directly to your Health
                    app.
                  </li>
                  <li>Your data is stored locally on your device.</li>
                </ul>
              </div>
              <button
                onClick={() => setShowScienceFAQ(true)}
                className='w-full p-4 flex items-center gap-3 text-left active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <BeakerIcon />
                </span>
                <span className='flex-1 text-text-primary'>How We Calculate</span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          </section>

          {/* Legal Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Legal
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <button
                onClick={() => handleOpenLink(legalContent.links.privacyPolicy)}
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <ShieldIcon />
                </span>
                <span className='flex-1 text-text-primary'>Privacy Policy</span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
              <button
                onClick={() =>
                  handleOpenLink(legalContent.links.termsOfService)
                }
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <DocumentIcon />
                </span>
                <span className='flex-1 text-text-primary'>
                  Terms of Service
                </span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
              <button
                onClick={() => setShowMedicalDisclaimer(true)}
                className='w-full p-4 flex items-center gap-3 text-left active:bg-black/5 transition-all'>
                <span className='text-text-secondary'>
                  <HeartIcon />
                </span>
                <span className='flex-1 text-text-primary'>
                  Medical Disclaimer
                </span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          </section>

          {/* Danger Zone Section */}
          <section className='mb-6'>
            <h2 className='text-xs font-medium text-text-secondary uppercase tracking-wide mb-3 px-1'>
              Danger Zone
            </h2>
            <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
              <button
                onClick={() => setShowOnboardingResetConfirm(true)}
                className='w-full p-4 flex items-center gap-3 text-left border-b border-black/5 active:bg-black/5 transition-all'>
                <span className='text-ember-alert'>
                  <RefreshIcon />
                </span>
                <span className='flex-1 text-ember-alert'>Redo Onboarding</span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
              <button
                onClick={() => setShowDeleteDataConfirm(true)}
                className='w-full p-4 flex items-center gap-3 text-left active:bg-black/5 transition-all'>
                <span className='text-ember-alert'>
                  <TrashIcon />
                </span>
                <span className='flex-1 text-ember-alert'>Delete All Data</span>
                <span className='text-text-primary/40'>
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          </section>

          {/* Version Footer */}
          <div className='text-center py-6'>
            <p className='text-xs text-text-muted mb-1'>
              {Capacitor.isNativePlatform() ? (
                <a
                  href='https://weatherkit.apple.com/legal-attribution.html'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:text-text-secondary transition-colors'>
                  Weather: Apple WeatherKit
                </a>
              ) : (
                'Weather: Simulated Data'
              )}
            </p>
            <p className='text-sm text-text-muted'>Version {packageJson.version}</p>
          </div>
        </div>

        {/* Redo Onboarding Confirmation Alert */}
        <IonAlert
          isOpen={showOnboardingResetConfirm}
          onDidDismiss={() => setShowOnboardingResetConfirm(false)}
          header='Redo Onboarding?'
          message='This will reset your onboarding answers and show the welcome screen again.'
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Redo',
              role: 'destructive',
              handler: handleResetOnboarding,
            },
          ]}
        />

        {/* Delete All Data Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteDataConfirm}
          onDidDismiss={() => setShowDeleteDataConfirm(false)}
          header='Delete All Data?'
          message='This will permanently delete all your sessions, supplements, cofactor logs, and profile data. This cannot be undone.'
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete Everything',
              role: 'destructive',
              handler: handleDeleteAllData,
            },
          ]}
        />

        {/* Science FAQ Modal */}
        <ScienceFAQ
          isOpen={showScienceFAQ}
          onDismiss={() => setShowScienceFAQ(false)}
        />

        {/* Medical Disclaimer Modal */}
        <IonModal
          isOpen={showMedicalDisclaimer}
          onDidDismiss={() => setShowMedicalDisclaimer(false)}
          initialBreakpoint={0.65}
          breakpoints={[0, 0.65, 0.85]}
        >
          <div className="px-6 py-8 h-full flex flex-col">
            {/* Disclaimer Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-black/5 shadow-sm rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  {/* Info Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-solar-flare/15 border border-solar-flare/30 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-solar-flare"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-[17px] font-semibold text-text-primary">Medical Disclaimer</h3>
                </div>

                {/* Disclaimer Points */}
                <div className="space-y-5">
                  {disclaimerPoints.map((point, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-solar-flare/15 border border-solar-flare/30 flex items-center justify-center mt-0.5">
                        <span className="text-[12px] font-semibold text-solar-flare">{index + 1}</span>
                      </div>
                      <p className="text-[15px] text-text-secondary leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Got it button */}
            <div className="mt-6">
              <button
                onClick={() => setShowMedicalDisclaimer(false)}
                className="w-full py-4 rounded-full text-[17px] font-semibold bg-black text-white active:scale-[0.98] transition-all duration-200 shadow-lg"
              >
                Got It
              </button>
            </div>
          </div>
        </IonModal>

        {/* HealthKit Error Toast */}
        <IonToast
          isOpen={showHealthKitError}
          onDidDismiss={() => setShowHealthKitError(false)}
          message={
            healthKitErrorMessage ||
            'HealthKit sync failed. Please grant access in Settings > Privacy & Security > Health.'
          }
          duration={5000}
          color='danger'
          position='top'
        />

        {/* Restore Success Alert */}
        <IonAlert
          isOpen={showRestoreSuccessAlert}
          onDidDismiss={() => setShowRestoreSuccessAlert(false)}
          header='Purchases Restored'
          message='Your purchases have been restored successfully!'
          buttons={['OK']}
        />

        {/* Restore Empty Alert */}
        <IonAlert
          isOpen={showRestoreEmptyAlert}
          onDidDismiss={() => setShowRestoreEmptyAlert(false)}
          header='No Purchases Found'
          message='There are no purchases to restore for this account.'
          buttons={['OK']}
        />

        {/* Delete Error Alert */}
        <IonAlert
          isOpen={showDeleteErrorAlert}
          onDidDismiss={() => setShowDeleteErrorAlert(false)}
          header='Error'
          message='Failed to delete data. Please try again.'
          buttons={['OK']}
        />

        {/* Blood Test Modal */}
        <BloodTestModal
          isOpen={showBloodTestModal}
          onClose={() => setShowBloodTestModal(false)}
          currentValue={bloodTestValue}
          currentUnit={bloodTestUnit}
          currentDate={bloodTestDate}
          onSave={handleSaveBloodTest}
        />
      </div>
    </AtmosphericBackground>
  );
}

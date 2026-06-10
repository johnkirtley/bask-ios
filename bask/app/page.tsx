'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { IonToast } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useSunData } from '../hooks/useSunData';
import { useOnboardingContext } from '../contexts/OnboardingContext';
import { useBaskSession } from '../hooks/useBaskSession';
import { useHealthKitSync } from '../hooks/useHealthKitSync';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useModal } from '../contexts/ModalContext';
import { useDWindowNotifications } from '../hooks/useDWindowNotifications';
import { useStreakState } from '../hooks/useStreakState';
import { useSubscription } from '../hooks/useSubscription';
import {
  sessionsRepository,
  supplementsRepository,
  StreakTransitionReason,
} from '../lib/database';
import {
  userProfileRepository,
  UserProfile,
} from '../lib/database/repositories/userProfileRepository';
import {
  calculateTimeToGoal,
  calculateTimeToBurn,
  formatTimeToBurn,
  formatDurationMinutes,
  calculateDailyDecayAmount,
  effectiveUv,
} from '../lib/dEngine';
import { resolveFitzpatrickType } from '../lib/profileUtils';
import { leaderboardService } from '../lib/supabase/leaderboardService';
import {
  getBloodTestCalibration,
  getBloodTestGuidanceHint,
} from '../lib/bloodTestUtils';
import { getMockClothingPresets } from '../lib/sunDataUtils';
import {
  calculateOptimalWindows,
  DWindowForecast,
  getSynthesisStatSubtext,
  isInSynthesisWindow,
  getSynthesisCountdown,
} from '../lib/dWindowForecast';
import { getBaskCta, ctaVariantToPhase } from '../lib/lightPhase';
import { BaskWeather } from '../lib/plugins';
import type { HourlyForecastItem } from '../lib/plugins/baskWeather';
import { getRepresentativeUvForPassiveSync } from '../lib/healthKitUvUtils';
import { handleLocationPermissionAction } from '../lib/locationPermissionUtils';
import { capture, ANALYTICS_EVENTS } from '../lib/analytics';
import { REVIEW_FEEDBACK_FORM_URL } from '../lib/constants';
import { canAccessSunburnRisk } from '../lib/sunburnRiskAccess';
import {
  getReviewEligibility,
  markNativeReviewRequested,
  markNegativeReviewFeedback,
  markReviewPromptShown,
  recordPaywallDismissedForReview,
  recordReviewAppOpen,
  requestAppReview,
} from '../lib/services/inAppReviewService';
import AtmosphericBackground from '../components/home/AtmosphericBackground';
import BaskRing from '../components/home/BaskRing';
import StatMetrics from '../components/home/StatMetrics';
import BaskNowButton from '../components/home/BaskNowButton';
import ActiveSessionView from '../components/home/ActiveSessionView';
import ClothingPresetSelector from '../components/home/ClothingPresetSelector';
import SolarWindowChart from '../components/home/SolarWindowChart';
import SupplementCard from '../components/home/SupplementCard';
import CofactorCard from '../components/home/CofactorCard';
import DWindowForecastCard from '../components/home/DWindowForecastCard';
import StreakCard from '../components/home/StreakCard';
import TrialOfferCard from '../components/home/TrialOfferCard';
import StreakDetailSheet from '../components/streaks/StreakDetailSheet';
import StreakMilestoneOverlay from '../components/streaks/StreakMilestoneOverlay';
import ReviewFeedbackModal from '../components/ui/ReviewFeedbackModal';
import ReviewPromptModal from '../components/ui/ReviewPromptModal';

/**
 * Format time to goal for the home stat (shows actual duration when achievable).
 */
function formatTimeToGoal(minutes: number): string {
  if (!isFinite(minutes)) return '--';
  return formatDurationMinutes(minutes);
}

/**
 * Web-preview only: synthesize a realistic 48-hour hourly forecast so the
 * D-Window card (and other sun-driven UI) is visible during local development.
 * Native builds use real WeatherKit data via BaskWeather.getHourlyForecast().
 */
function buildMockHourlyForecast(): HourlyForecastItem[] {
  const items: HourlyForecastItem[] = [];
  const start = new Date();
  start.setMinutes(0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const d = new Date(start.getTime() + i * 60 * 60 * 1000);
    const hour = d.getHours();
    // Bell-curve UV peaking ~9 around solar noon (13:00), zero outside daylight.
    const daylight = hour >= 6 && hour <= 19;
    const uvIndex = daylight
      ? Math.max(0, Math.round(9 * Math.exp(-Math.pow(hour - 13, 2) / 12) * 10) / 10)
      : 0;
    items.push({
      date: d.toISOString(),
      hour,
      temperature: 18 + (uvIndex > 0 ? uvIndex : 0),
      uvIndex,
      cloudCover: 0.1,
      humidity: 0.5,
      symbolName: uvIndex > 3 ? 'sun.max' : 'cloud.sun',
      condition: uvIndex > 3 ? 'Clear' : 'Partly Cloudy',
    });
  }
  return items;
}

export default function Home() {
  const {
    isLive,
    locationDenied,
    locationNeedsConnection,
    isLoading,
    locationCity,
    locationState,
    refreshGoal,
    ...sunData
  } = useSunData();
  const { answers } = useOnboardingContext();
  const timeOfDay = useTimeOfDay();
  const { setSessionActive } = useModal();
  const { isPremium, presentPaywall } = useSubscription();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Clothing preset state
  const [selectedPresetId, setSelectedPresetId] = useState('t-shirt-shorts');
  const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);
  const [isStreakSheetOpen, setIsStreakSheetOpen] = useState(false);
  const presets = getMockClothingPresets();
  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[2];

  // Daily total (sessions + supplements)
  const [todayTotal, setTodayTotal] = useState(0);
  const [todaySunIU, setTodaySunIU] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewCheckKey, setReviewCheckKey] = useState(0);
  const [reviewPromptMetrics, setReviewPromptMetrics] = useState<{
    appOpenCount: number;
    valueEventCount: number;
  } | null>(null);
  const [showReviewFeedbackPrompt, setShowReviewFeedbackPrompt] = useState(false);
  const refreshReasonRef = useRef<StreakTransitionReason>('app_open');

  useEffect(() => {
    userProfileRepository
      .get()
      .then(setUserProfile)
      .catch(() => setUserProfile(null));
  }, [refreshKey]);

  const fitzpatrickType = useMemo(
    () => resolveFitzpatrickType(userProfile, answers),
    [userProfile, answers],
  );

  const bloodTestCalibration = useMemo(
    () => getBloodTestCalibration(userProfile),
    [userProfile],
  );

  const hasSunburnRiskAccess = useMemo(
    () => canAccessSunburnRisk({ isPremium, userProfile }),
    [isPremium, userProfile],
  );

  // Session tracking — pass sun data from parent to avoid duplicate WeatherKit polling
  const sessionSunData = useMemo(() => {
    const rawUvIndex = sunData.uvIndex;
    const effective = effectiveUv(rawUvIndex, sunData.cloudCover);
    return { rawUvIndex, effectiveUV: effective };
  }, [sunData.uvIndex, sunData.cloudCover]);
  const session = useBaskSession(
    fitzpatrickType,
    answers.age,
    sessionSunData,
    hasSunburnRiskAccess,
  );

  // HealthKit sync (passive daylight tracking) - premium only
  const healthKitSync = useHealthKitSync(
    isPremium
      ? {
          fitzpatrickType,
          age: answers.age ?? null,
        }
      : undefined,
  );
  const previousHealthKitSyncCountRef = useRef(healthKitSync.syncCount);

  // Update session active state for UI hiding (TabBar, etc.)
  useEffect(() => {
    setSessionActive(session.isActive || session.isPaused);
  }, [session.isActive, session.isPaused, setSessionActive]);

  // D-Window Forecast state
  const [dWindowForecast, setDWindowForecast] =
    useState<DWindowForecast | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>([]);
  const [isRefreshingForecast, setIsRefreshingForecast] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const {
    summary: goalStreakSummary,
    state: streakState,
    firstLogToastOpen,
    pendingMilestone,
    refreshStreak,
    dismissFirstLogToast,
    dismissMilestone,
  } = useStreakState(sunData.vitaminDGoal);

  // Reconcile notifications when forecast, premium eligibility, or streak state changes
  useDWindowNotifications(dWindowForecast, isPremium, goalStreakSummary);

  const loadTodayTotal = useCallback(
    async (reason: StreakTransitionReason = 'manual') => {
      try {
        const [sessionsIU, supplementsIU] = await Promise.all([
          sessionsRepository.getTodayTotalIU(),
          supplementsRepository.getTodayTotalIU(),
        ]);
        setTodaySunIU(sessionsIU);
        setTodayTotal(sessionsIU + supplementsIU);
        await refreshStreak(reason);
        if (reason === 'log' || reason === 'app_open') {
          setReviewCheckKey((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Failed to load today total:', error);
      }
    },
    [refreshStreak],
  );

  useEffect(() => {
    const healthKitSynced =
      healthKitSync.syncCount !== previousHealthKitSyncCountRef.current;
    const reason =
      session.status === 'completed' || healthKitSynced
        ? 'log'
        : refreshReasonRef.current;
    previousHealthKitSyncCountRef.current = healthKitSync.syncCount;
    refreshReasonRef.current = 'manual';
    void loadTodayTotal(reason);
  }, [session.status, refreshKey, healthKitSync.syncCount, loadTodayTotal]); // Reload when session completes, supplement is logged, HealthKit syncs, or the goal changes

  // Load D-Window Forecast
  const loadForecast = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web preview: synthesize a forecast so the D-Window card is visible
      // during local development (native uses real WeatherKit data below).
      try {
        const exposurePercent = 100 - selectedPreset.coveragePercent;
        const mockHourly = buildMockHourlyForecast();
        setHourlyForecast(mockHourly);
        setDWindowForecast(
          calculateOptimalWindows(
            mockHourly,
            fitzpatrickType,
            exposurePercent,
            sunData.vitaminDGoal,
            answers.age,
          ),
        );
      } catch (error) {
        console.warn('Failed to build mock D-Window forecast:', error);
      }
      return;
    }

    setIsRefreshingForecast(true);

    // Haptic feedback on refresh
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available (web preview)
    }

    try {
      const hourlyData = await BaskWeather.getHourlyForecast();
      setHourlyForecast(hourlyData.forecast);
      const exposurePercent = 100 - selectedPreset.coveragePercent;
      const forecast = calculateOptimalWindows(
        hourlyData.forecast,
        fitzpatrickType,
        exposurePercent,
        sunData.vitaminDGoal,
        answers.age,
      );
      setDWindowForecast(forecast);
    } catch (error) {
      console.warn('Failed to load D-Window forecast:', error);
    } finally {
      setIsRefreshingForecast(false);
    }
  }, [
    fitzpatrickType,
    selectedPreset.coveragePercent,
    answers.age,
    sunData.vitaminDGoal,
  ]);

  useEffect(() => {
    loadForecast();
    // Refresh forecast every 5 minutes (synced with sunData updates)
    const interval = setInterval(loadForecast, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadForecast]); // loadForecast now includes uvIndex in its deps

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => void } | undefined;

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        capture(ANALYTICS_EVENTS.appOpened);
        recordReviewAppOpen().finally(() =>
          setReviewCheckKey((prev) => prev + 1),
        );
        void loadForecast();
        void loadTodayTotal('app_open');
        void leaderboardService.syncParticipationState();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [loadForecast, loadTodayTotal]);

  useEffect(() => {
    recordReviewAppOpen().finally(() => setReviewCheckKey((prev) => prev + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkReviewEligibility() {
      if (reviewPromptMetrics) return;

      const eligibility = await getReviewEligibility({
        isSessionActive: session.isActive || session.isPaused,
      });
      if (cancelled || !eligibility.eligible) return;

      await markReviewPromptShown();
      if (cancelled) return;

      setReviewPromptMetrics({
        appOpenCount: eligibility.appOpenCount,
        valueEventCount: eligibility.valueEventCount,
      });
      capture(ANALYTICS_EVENTS.reviewPromptShown, {
        app_open_count: eligibility.appOpenCount,
        value_event_count: eligibility.valueEventCount,
      });
    }

    checkReviewEligibility().catch((error) => {
      console.warn('Failed to check review eligibility:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [reviewCheckKey, reviewPromptMetrics, session.isActive, session.isPaused]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('focus') !== 'dwindow') return;

    document
      .getElementById('dwindow-forecast')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [dWindowForecast]);

  const handleProgressChanged = (reason: StreakTransitionReason = 'manual') => {
    refreshReasonRef.current = reason;
    setRefreshKey((prev) => prev + 1);
  };

  // Calculate effective UV accounting for cloud cover (matches D-Window forecast logic)
  const effectiveUV = sessionSunData.effectiveUV;

  const { sync: syncHealthKit, isEnabled: healthKitEnabled } = healthKitSync;

  const passiveSyncUv = useMemo(
    () => getRepresentativeUvForPassiveSync(effectiveUV, hourlyForecast),
    [effectiveUV, hourlyForecast],
  );

  // Re-sync HealthKit when premium + enabled; uses daily forecast UV, not only current moment
  useEffect(() => {
    if (!isPremium || !healthKitEnabled) return;
    syncHealthKit(passiveSyncUv);
  }, [isPremium, healthKitEnabled, syncHealthKit, passiveSyncUv]);

  // Calculate time to goal using D-Engine
  const remainingIU = Math.max(
    0,
    sunData.vitaminDGoal - todayTotal - session.currentIU,
  );
  const exposurePercent = 100 - selectedPreset.coveragePercent;
  const timeToGoal = calculateTimeToGoal(
    remainingIU,
    effectiveUV,
    exposurePercent,
    fitzpatrickType,
    answers.age,
  );

  const timeToBurnMinutes =
    !isLoading && effectiveUV >= 3
      ? calculateTimeToBurn(sunData.uvIndex, fitzpatrickType)
      : Infinity;

  // Personalized time to burn (matches active session model)
  const burnRisk =
    isLoading || effectiveUV <= 0
      ? '—'
      : effectiveUV < 3
      ? 'Low'
      : formatTimeToBurn(calculateTimeToBurn(sunData.uvIndex, fitzpatrickType));

  const canStartSession = !isLoading && effectiveUV > 0;
  const isCurrentCloudBlocked =
    !isLoading && sunData.uvIndex >= 3 && effectiveUV < 3;

  // Adaptive idle CTA: morning light vs vitamin D vs generic low-UV light session.
  const synthesisCountdownMin =
    getSynthesisCountdown(dWindowForecast?.todaySynthesis ?? null, now)?.minutesUntil ??
    null;
  const baskCta = getBaskCta({
    rawUV: sunData.uvIndex,
    effectiveUV,
    timeOfDay,
    synthesisCountdownMin,
  });

  const labGuidanceHint = getBloodTestGuidanceHint(bloodTestCalibration);

  // Daily decay (educational - shows ~4.5% decay per day)
  // Always use vitaminDGoal as baseline for consistent daily target
  const dailyDecay = calculateDailyDecayAmount(sunData.vitaminDGoal);

  const synthesisStatSubtext = getSynthesisStatSubtext(
    dWindowForecast?.todaySynthesis ?? null,
    dWindowForecast?.today ?? null,
    now,
  );

  // D-Window forecast is the source of truth for whether synthesis is possible
  // right now, so the supplement card stays consistent with the forecast card.
  const synthesisActiveNow =
    !isCurrentCloudBlocked &&
    isInSynthesisWindow(dWindowForecast?.todaySynthesis ?? null, now);

  const timeToGoalSubtext = (() => {
    if (remainingIU <= 0) return "Today's goal reached";

    if (
      isFinite(timeToGoal) &&
      isFinite(timeToBurnMinutes) &&
      timeToGoal > timeToBurnMinutes
    ) {
      const goalLabel = formatDurationMinutes(timeToGoal);
      const burnLabel = formatTimeToBurn(timeToBurnMinutes);
      return `Goal may take ~${goalLabel} today. Limit each sun session to ${burnLabel} before taking a break.`;
    }

    // Shadow rule: no vitamin D synthesis below UV 3, so the estimate is blank.
    // Keep this to one short status sentence — the lab note renders separately.
    if (!isFinite(timeToGoal) && effectiveUV < 3) {
      // Raw UV is strong but clouds are cutting it below the synthesis threshold.
      return sunData.uvIndex >= 3
        ? 'Clouds are blocking vitamin D right now.'
        : 'UV is too low for vitamin D right now.';
    }

    if (isFinite(timeToGoal) && timeToGoal > 120) {
      return 'Try multiple shorter sessions or a supplement to reach your goal today.';
    }

    if (isFinite(timeToGoal) && timeToGoal <= 120) return undefined;
    if (synthesisStatSubtext) return synthesisStatSubtext;
    if (!isFinite(timeToGoal) || timeToGoal > 24 * 60) {
      return dWindowForecast?.today
        ? 'Based on current UV'
        : 'Consider supplementing today';
    }
    return undefined;
  })();

  // Generate warm greeting based on time of day
  const greeting = useMemo(() => {
    switch (timeOfDay) {
      case 'morning':
        return 'Good morning';
      case 'midday':
        return 'Good afternoon';
      case 'evening':
        return 'Good evening';
      case 'night':
        return 'Good night';
      default:
        return 'Hey there';
    }
  }, [timeOfDay]);

  // Handle location warning press
  const handleLocationWarningPress = async () => {
    capture(ANALYTICS_EVENTS.locationPermissionRequested, { source: 'home' });
    const status = await handleLocationPermissionAction();
    if (status === 'granted') {
      // Re-run fetchSunData immediately so the screen flips to live data
      refreshGoal();
    }
  };

  // Handle session start
  const handleStartSession = async () => {
    await session.startSession(
      selectedPresetId,
      selectedPreset.coveragePercent,
      ctaVariantToPhase(baskCta.variant),
    );
  };

  const handleOpenSunburnRiskPaywall = useCallback(async () => {
    capture(ANALYTICS_EVENTS.paywallPresented, {
      source: session.isActive || session.isPaused
        ? 'live_session_sunburn_risk'
        : 'home_sunburn_risk',
    });

    try {
      await presentPaywall();
    } finally {
      await recordPaywallDismissedForReview();
    }
  }, [presentPaywall, session.isActive, session.isPaused]);

  const handleOpenTrialOfferPaywall = useCallback(async () => {
    capture(ANALYTICS_EVENTS.paywallPresented, {
      source: 'home_trial_offer',
    });

    try {
      await presentPaywall();
    } finally {
      await recordPaywallDismissedForReview();
    }
  }, [presentPaywall]);

  const handlePositiveReviewFeedback = async () => {
    if (!reviewPromptMetrics) return;

    capture(ANALYTICS_EVENTS.reviewPositiveResponse, {
      app_open_count: reviewPromptMetrics.appOpenCount,
      value_event_count: reviewPromptMetrics.valueEventCount,
    });
    setReviewPromptMetrics(null);
    await requestAppReview();
    await markNativeReviewRequested();
    capture(ANALYTICS_EVENTS.reviewNativePromptRequested, {
      source: 'value_prompt',
    });
  };

  const handleNegativeReviewFeedback = async () => {
    if (!reviewPromptMetrics) return;

    capture(ANALYTICS_EVENTS.reviewNegativeResponse, {
      app_open_count: reviewPromptMetrics.appOpenCount,
      value_event_count: reviewPromptMetrics.valueEventCount,
    });
    await markNegativeReviewFeedback();
    setReviewPromptMetrics(null);
    setShowReviewFeedbackPrompt(true);
  };

  const handleOpenReviewFeedbackForm = async () => {
    setShowReviewFeedbackPrompt(false);
    capture(ANALYTICS_EVENTS.reviewFeedbackOpened, {
      source: 'value_prompt',
    });
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: REVIEW_FEEDBACK_FORM_URL });
      } else {
        window.open(REVIEW_FEEDBACK_FORM_URL, '_blank');
      }
    } catch {
      window.open(REVIEW_FEEDBACK_FORM_URL, '_blank');
    }
  };

  // If session is active or paused, show active session view
  if (session.isActive || session.isPaused) {
    return (
      <ActiveSessionView
        formattedTime={session.formattedTime}
        currentIU={session.currentIU}
        sunburnCountdown={
          hasSunburnRiskAccess ? session.formattedSunburnCountdown : ''
        }
        remainingSunburnSeconds={
          hasSunburnRiskAccess ? session.remainingSunburnSeconds : 0
        }
        isPaused={session.isPaused}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onEnd={session.endSession}
        onCancel={session.cancelSession}
        uvIndex={sunData.uvIndex}
        cloudCover={sunData.cloudCover}
        exposurePercent={exposurePercent}
        canAccessSunburnRisk={hasSunburnRiskAccess}
        onUnlockSunburnRisk={handleOpenSunburnRiskPaywall}
        dailyGoalIU={sunData.vitaminDGoal}
        baselineTodayIU={todayTotal}
        hasSynthesized={session.hasSynthesized}
        isSynthesizing={session.isSynthesizing}
        synthesisCountdownMinutes={synthesisCountdownMin}
        timeOfDay={timeOfDay}
      />
    );
  }

  // Default idle view
  return (
    <>
      <AtmosphericBackground>
        <div className='min-h-screen pb-24 pt-safe overflow-x-hidden overflow-hidden overscroll-contain'>
          {/* Header */}
          <div className='px-6 py-6'>
            <div className='flex justify-between items-center'>
              <div>
                <h1 className='text-[32px] font-extrabold text-text-primary tracking-[-0.02em]'>
                  {greeting}
                </h1>
                {isLive && (
                  <div
                    className='flex items-center gap-1.5 mt-1'
                    role='status'
                    aria-label='Live weather monitoring active'>
                    <div
                      className='w-2 h-2 rounded-full bg-green-400 animate-pulse-live'
                      aria-hidden='true'
                    />
                    <span className='text-xs text-text-secondary'>
                      {locationCity && locationState
                        ? `Monitoring Weather in ${locationCity}, ${locationState}`
                        : 'Live Weather'}
                    </span>
                  </div>
                )}
                {!isLive && locationDenied && (
                  <button
                    onClick={handleLocationWarningPress}
                    className='flex items-center gap-1.5 mt-1 group'
                    aria-label='Location access denied. Tap to open Settings.'>
                    <div
                      className='w-2 h-2 rounded-full bg-red-400 animate-pulse-denied'
                      aria-hidden='true'
                    />
                    <span className='text-xs text-ember-alert group-hover:text-red-600'>
                      Enable Location for Accurate Data
                    </span>
                  </button>
                )}
                {!isLive && !locationDenied && locationNeedsConnection && (
                  <button
                    onClick={handleLocationWarningPress}
                    className='flex items-center gap-1.5 mt-1 group'
                    aria-label='Connect your location for live sun data'>
                    <div
                      className='w-2 h-2 rounded-full bg-amber-400 animate-pulse-live'
                      aria-hidden='true'
                    />
                    <span className='text-xs text-amber-600 group-hover:text-amber-700'>
                      Connect your location for live UV data
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hero: Glowing Ring */}
          <BaskRing
            vitaminDProgress={(todayTotal / sunData.vitaminDGoal) * 100}
            vitaminDGoal={sunData.vitaminDGoal}
            vitaminDCurrent={todayTotal}
            onGoalUpdated={() => {
              refreshGoal();
              handleProgressChanged('goal_change');
            }}
          />

          {/* Bask Now Button - directly under ring */}
          <div className='px-6 -mt-2'>
            <BaskNowButton
              preset={selectedPreset.name}
              onPress={handleStartSession}
              onPresetChange={() => setIsPresetSelectorOpen(true)}
              disabled={!canStartSession}
              label={baskCta.label}
              helper={baskCta.helper}
              variant={baskCta.variant}
              disabledReason={
                isLoading
                  ? 'Checking current UV conditions…'
                  : "No daylight right now. Check back when the sun's up."
              }
            />
          </div>

          {/* Daily Goal Streak */}
          <div className='px-6 mt-6'>
            <StreakCard
              summary={goalStreakSummary}
              todayTotalIU={todayTotal}
              vitaminDGoal={sunData.vitaminDGoal}
            />
          </div>

          {!isPremium && (
            <div className='px-6 mt-3'>
              <TrialOfferCard onPress={handleOpenTrialOfferPaywall} />
            </div>
          )}

          {/* Stat Metrics */}
          <div className='px-6 mt-6'>
            <StatMetrics
              timeToGoal={
                isLoading || effectiveUV <= 0
                  ? '—'
                  : formatTimeToGoal(timeToGoal)
              }
              timeToGoalSubtext={
                isLoading || effectiveUV <= 0
                  ? 'Waiting for UV data'
                  : timeToGoalSubtext
              }
              timeToGoalLabHint={!isLoading ? labGuidanceHint : null}
              isLoading={isLoading}
              burnRisk={hasSunburnRiskAccess ? burnRisk : ''}
              burnRiskSubtext={
                hasSunburnRiskAccess && !isLoading && effectiveUV >= 3
                  ? 'Estimated time to skin redness at current UV'
                  : undefined
              }
              canAccessSunburnRisk={hasSunburnRiskAccess}
              onUnlockSunburnRisk={handleOpenSunburnRiskPaywall}
              dailyDecay={dailyDecay}
              decaySubtext={(() => {
                const remaining = dailyDecay - todayTotal;
                return remaining > 0
                  ? `Get ~${remaining} IU more today`
                  : "Today's decay covered";
              })()}
              decayCovered={todayTotal >= dailyDecay}
              decayInfoText='Vitamin D has a roughly 15-day half-life, so the body gradually clears it over time, on the order of a few percent per day. Regular sun exposure or supplementation helps maintain healthy levels. This is general educational information, not a measurement of your personal vitamin D level.'
            />
          </div>

          {/* D-Window Forecast (MOAT Feature) */}
          {dWindowForecast && (
            <div className='px-6 mt-6'>
              <DWindowForecastCard
                forecast={dWindowForecast}
                onRefresh={loadForecast}
                isRefreshing={isRefreshingForecast}
                isPremium={isPremium}
                isCurrentCloudBlocked={isCurrentCloudBlocked}
                sunsetTime={sunData.sunsetTime}
              />
            </div>
          )}

          {/* Solar Window Chart */}
          <div className='px-6 mt-6'>
            <SolarWindowChart
              uvCurve={sunData.uvCurve}
              sweetSpotStart={sunData.sweetSpotStart}
              sweetSpotEnd={sunData.sweetSpotEnd}
              hasOptimalWindow={sunData.hasOptimalWindow}
              sunriseTime={sunData.sunriseTime}
              solarNoonTime={sunData.solarNoonTime}
              sunsetTime={sunData.sunsetTime}
            />
          </div>

          {/* Supplement Quick-Add Card with Weather-Adjusted Recommendations */}
          <div className='px-6 mt-6'>
            <SupplementCard
              onSupplementLogged={() => handleProgressChanged('log')}
              todaySunIU={todaySunIU}
              uvIndex={isLoading ? undefined : effectiveUV}
              synthesisActiveNow={synthesisActiveNow}
              vitaminDGoal={sunData.vitaminDGoal}
              bloodTestCalibration={bloodTestCalibration}
            />
          </div>

          {/* Cofactor Tracking Card */}
          <div className='px-6 mt-6'>
            <CofactorCard onCofactorLogged={handleProgressChanged} />
          </div>

          {/* WeatherKit Attribution */}
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
          </div>
        </div>
      </AtmosphericBackground>

      {/* Clothing Preset Selector */}
      <ClothingPresetSelector
        isOpen={isPresetSelectorOpen}
        onClose={() => setIsPresetSelectorOpen(false)}
        onSelect={(id) => {
          capture(ANALYTICS_EVENTS.clothingPresetChanged, {
            preset_id: id,
            coverage_percent: presets.find((p) => p.id === id)?.coveragePercent,
          });
          setSelectedPresetId(id);
          setIsPresetSelectorOpen(false);
        }}
        presets={presets}
        selectedId={selectedPresetId}
      />

      <StreakDetailSheet
        isOpen={isStreakSheetOpen}
        onClose={() => setIsStreakSheetOpen(false)}
        summary={goalStreakSummary}
        state={streakState}
      />

      <StreakMilestoneOverlay
        milestone={pendingMilestone}
        onDismiss={dismissMilestone}
      />

      <IonToast
        isOpen={firstLogToastOpen}
        onDidDismiss={dismissFirstLogToast}
        message='Streak started 🔥 Log again tomorrow to keep it going.'
        duration={4000}
        position='top'
        cssClass='toast-safe-top'
      />

      <ReviewPromptModal
        isOpen={!!reviewPromptMetrics}
        onPositive={() => void handlePositiveReviewFeedback()}
        onNegative={() => void handleNegativeReviewFeedback()}
      />

      <ReviewFeedbackModal
        isOpen={showReviewFeedbackPrompt}
        onClose={() => setShowReviewFeedbackPrompt(false)}
        onSendFeedback={() => void handleOpenReviewFeedbackForm()}
      />
    </>
  );
}

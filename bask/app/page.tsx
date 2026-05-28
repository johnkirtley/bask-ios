'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { IonToast } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
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
import { userProfileRepository, UserProfile } from '../lib/database/repositories/userProfileRepository';
import {
  calculateTimeToGoal,
  calculateTimeToBurn,
  formatTimeToBurn,
  formatDurationMinutes,
  calculateDailyDecayAmount,
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
} from '../lib/dWindowForecast';
import { BaskWeather } from '../lib/plugins';
import { handleLocationPermissionAction } from '../lib/locationPermissionUtils';
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
import StreakBadge from '../components/home/StreakBadge';
import StreakDetailSheet from '../components/streaks/StreakDetailSheet';
import StreakMilestoneOverlay from '../components/streaks/StreakMilestoneOverlay';

/**
 * Format time to goal for the home stat (shows actual duration when achievable).
 */
function formatTimeToGoal(minutes: number): string {
  if (!isFinite(minutes)) return '--';
  return formatDurationMinutes(minutes);
}

export default function Home() {
  const {
    isLive,
    locationDenied,
    isLoading,
    locationCity,
    locationState,
    refreshGoal,
    ...sunData
  } = useSunData();
  const { answers } = useOnboardingContext();
  const timeOfDay = useTimeOfDay();
  const { setSessionActive } = useModal();
  const { isPremium } = useSubscription();

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

  // Session tracking — pass sun data from parent to avoid duplicate WeatherKit polling
  const sessionSunData = useMemo(() => {
    const rawUvIndex = sunData.uvIndex;
    const effective =
      sunData.cloudCover !== undefined
        ? rawUvIndex * (1 - sunData.cloudCover * 0.7)
        : rawUvIndex;
    return { rawUvIndex, effectiveUV: effective };
  }, [sunData.uvIndex, sunData.cloudCover]);
  const session = useBaskSession(fitzpatrickType, answers.age, sessionSunData);

  // HealthKit sync (passive daylight tracking) - premium only
  const healthKitSync = useHealthKitSync(isPremium ? {
    fitzpatrickType,
    age: answers.age ?? null,
  } : undefined);
  const previousHealthKitSyncCountRef = useRef(healthKitSync.syncCount);

  // Update session active state for UI hiding (TabBar, etc.)
  useEffect(() => {
    setSessionActive(session.isActive || session.isPaused);
  }, [session.isActive, session.isPaused, setSessionActive]);

  // D-Window Forecast state
  const [dWindowForecast, setDWindowForecast] =
    useState<DWindowForecast | null>(null);
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

  const loadTodayTotal = useCallback(async (
    reason: StreakTransitionReason = 'manual',
  ) => {
    try {
      const [sessionsIU, supplementsIU] = await Promise.all([
        sessionsRepository.getTodayTotalIU(),
        supplementsRepository.getTodayTotalIU(),
      ]);
      setTodaySunIU(sessionsIU);
      setTodayTotal(sessionsIU + supplementsIU);
      await refreshStreak(reason);
    } catch (error) {
      console.error('Failed to load today total:', error);
    }
  }, [refreshStreak]);

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
      // Web fallback - use mock data
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
  }, [fitzpatrickType, selectedPreset.coveragePercent, answers.age, sunData.vitaminDGoal]);

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
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('focus') !== 'dwindow') return;

    document
      .getElementById('dwindow-forecast')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [dWindowForecast]);

  const handleProgressChanged = (
    reason: StreakTransitionReason = 'manual',
  ) => {
    refreshReasonRef.current = reason;
    setRefreshKey((prev) => prev + 1);
  };

  // Calculate effective UV accounting for cloud cover (matches D-Window forecast logic)
  const effectiveUV = sessionSunData.effectiveUV;

  const { sync: syncHealthKit, isEnabled: healthKitEnabled } = healthKitSync;

  // Re-sync HealthKit passive IU when live UV is available (replaces fallback UV=5)
  useEffect(() => {
    if (!isPremium || !healthKitEnabled || effectiveUV <= 0) return;
    syncHealthKit(effectiveUV);
  }, [isPremium, healthKitEnabled, syncHealthKit, effectiveUV]);

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
        : formatTimeToBurn(
            calculateTimeToBurn(sunData.uvIndex, fitzpatrickType),
          );

  const canStartSession = !isLoading && effectiveUV > 0;

  const labGuidanceHint = getBloodTestGuidanceHint(bloodTestCalibration);

  // Daily decay (educational - shows ~4.5% decay per day)
  // Always use vitaminDGoal as baseline for consistent daily target
  const dailyDecay = calculateDailyDecayAmount(sunData.vitaminDGoal);

  const synthesisStatSubtext = getSynthesisStatSubtext(
    dWindowForecast?.todaySynthesis ?? null,
    dWindowForecast?.today ?? null,
    now,
  );

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

    if (labGuidanceHint && (effectiveUV <= 0 || !isFinite(timeToGoal) || timeToGoal > 120)) {
      return labGuidanceHint;
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

  // Generate greeting based on time of day
  const greeting = useMemo(() => {
    switch (timeOfDay) {
      case 'morning':
        return 'Good Morning';
      case 'midday':
        return 'Good Afternoon';
      case 'evening':
        return 'Good Evening';
      case 'night':
        return 'Good Evening';
      default:
        return 'Welcome';
    }
  }, [timeOfDay]);

  // Handle location warning press
  const handleLocationWarningPress = async () => {
    await handleLocationPermissionAction();
  };

  // Handle session start
  const handleStartSession = async () => {
    await session.startSession(
      selectedPresetId,
      selectedPreset.coveragePercent,
    );
  };

  // If session is active or paused, show active session view
  if (session.isActive || session.isPaused) {
    return (
      <ActiveSessionView
        formattedTime={session.formattedTime}
        currentIU={session.currentIU}
        sunburnCountdown={session.formattedSunburnCountdown}
        remainingSunburnSeconds={session.remainingSunburnSeconds}
        isPaused={session.isPaused}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onEnd={session.endSession}
        onCancel={session.cancelSession}
        uvIndex={sunData.uvIndex}
        cloudCover={sunData.cloudCover}
        exposurePercent={exposurePercent}
      />
    );
  }

  // Default idle view
  return (
    <>
      <AtmosphericBackground>
        <div className='pb-24 pt-safe'>
          {/* Header */}
          <div className='px-6 py-6'>
            <div className='flex justify-between items-center'>
              <div>
                <div className='flex items-center gap-3'>
                  <h1 className='text-3xl font-semibold text-text-primary'>
                    {greeting}
                  </h1>
                  <StreakBadge
                    currentStreak={goalStreakSummary?.currentStreak ?? 0}
                    onPress={() => setIsStreakSheetOpen(true)}
                  />
                </div>
                {isLive && (
                  <div className='flex items-center gap-1.5 mt-1' role='status' aria-label='Live weather monitoring active'>
                    <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse-live' aria-hidden='true' />
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
                    <div className='w-2 h-2 rounded-full bg-red-400 animate-pulse-denied' aria-hidden='true' />
                    <span className='text-xs text-ember-alert group-hover:text-red-600'>
                      Enable Location for Accurate Data
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
              disabledReason={
                isLoading
                  ? 'Checking current UV conditions…'
                  : 'UV too low for vitamin D synthesis right now'
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

          {/* Stat Metrics */}
          <div className='px-6 mt-6'>
            <StatMetrics
              timeToGoal={
                isLoading || effectiveUV <= 0 ? '—' : formatTimeToGoal(timeToGoal)
              }
              timeToGoalSubtext={
                isLoading || effectiveUV <= 0
                  ? 'Waiting for UV data'
                  : timeToGoalSubtext
              }
              isLoading={isLoading}
              burnRisk={burnRisk}
              burnRiskSubtext={
                !isLoading && effectiveUV >= 3
                  ? 'Estimated time to skin redness at current UV'
                  : undefined
              }
              dailyDecay={dailyDecay}
              decaySubtext={(() => {
                const remaining = dailyDecay - todayTotal;
                return remaining > 0
                  ? `Get ~${remaining} IU more today`
                  : "Today's decay covered";
              })()}
              decayCovered={todayTotal >= dailyDecay}
              decayInfoText='Your body breaks down vitamin D over time. With a 15-day half-life, you lose about 4.5% of your stored vitamin D each day. Regular sun exposure or supplementation helps maintain healthy levels.'
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
      />

    </>
  );
}

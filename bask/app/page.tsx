'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSunData } from '../hooks/useSunData';
import { useOnboarding } from '../hooks/useOnboarding';
import { useBaskSession } from '../hooks/useBaskSession';
import { sessionsRepository, supplementsRepository } from '../lib/database';
import { deriveFitzpatrickType, calculateTimeToGoal, getBurnRiskLevel, calculateDailyDecayAmount } from '../lib/dEngine';
import { getMockClothingPresets } from '../lib/mockData';
import AtmosphericBackground from '../components/home/AtmosphericBackground';
import BaskRing from '../components/home/BaskRing';
import GlassCard from '../components/home/GlassCard';
import BaskNowButton from '../components/home/BaskNowButton';
import ActiveSessionView from '../components/home/ActiveSessionView';
import ClothingPresetSelector from '../components/home/ClothingPresetSelector';
import SolarWindowChart from '../components/home/SolarWindowChart';
import SupplementCard from '../components/home/SupplementCard';
import CofactorCard from '../components/home/CofactorCard';

export default function Home() {
  const sunData = useSunData();
  const { answers } = useOnboarding();

  // Calculate Fitzpatrick type from onboarding
  const fitzpatrickType = useMemo(() => {
    if (answers.skinTone && answers.sunReaction) {
      return deriveFitzpatrickType(answers.skinTone, answers.sunReaction);
    }
    return 2; // Default to Type II
  }, [answers.skinTone, answers.sunReaction]);

  // Clothing preset state
  const [selectedPresetId, setSelectedPresetId] = useState('t-shirt-shorts');
  const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);
  const presets = getMockClothingPresets();
  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? presets[2];

  // Session tracking
  const session = useBaskSession(fitzpatrickType);

  // Daily total (sessions + supplements)
  const [todayTotal, setTodayTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadTodayTotal() {
      try {
        const sessionsIU = await sessionsRepository.getTodayTotalIU();
        const supplementsIU = await supplementsRepository.getTodayTotalIU();
        setTodayTotal(sessionsIU + supplementsIU);
      } catch (error) {
        console.error('Failed to load today total:', error);
      }
    }
    loadTodayTotal();
  }, [session.status, refreshKey]); // Reload when session completes or supplement is logged

  const handleSupplementLogged = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculate time to goal using D-Engine
  const remainingIU = Math.max(0, sunData.vitaminDGoal - todayTotal - session.currentIU);
  const exposurePercent = 100 - selectedPreset.coveragePercent;
  const timeToGoal = calculateTimeToGoal(
    remainingIU,
    sunData.uvIndex,
    exposurePercent,
    fitzpatrickType
  );
  const timeToGoalMinutes = timeToGoal === Infinity ? '∞' : Math.round(timeToGoal);

  // Burn risk
  const burnRisk = getBurnRiskLevel(sunData.uvIndex);

  // Daily decay (educational - shows ~4.5% decay per day)
  const dailyDecay = calculateDailyDecayAmount(todayTotal > 0 ? todayTotal : 5000);

  // Handle session start
  const handleStartSession = async () => {
    await session.startSession(selectedPresetId, selectedPreset.coveragePercent);
  };

  // If session is active or paused, show active session view
  if (session.isActive || session.isPaused) {
    return (
      <ActiveSessionView
        formattedTime={session.formattedTime}
        currentIU={session.currentIU}
        projectedTimeToBurn={session.projectedTimeToBurn}
        isPaused={session.isPaused}
        onPause={session.pauseSession}
        onResume={session.resumeSession}
        onEnd={session.endSession}
        onCancel={session.cancelSession}
      />
    );
  }

  // Default idle view
  return (
    <>
      <AtmosphericBackground>
        <div className="pb-24 pt-safe">
          {/* Header */}
          <div className="px-6 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
              {/* Notification bell */}
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Hero: Glowing Ring */}
          <BaskRing
            vitaminDProgress={(todayTotal / sunData.vitaminDGoal) * 100}
            vitaminDGoal={sunData.vitaminDGoal}
            vitaminDCurrent={todayTotal}
          />

          {/* Stat Cards */}
          <div className="px-6 mt-8 grid grid-cols-3 gap-3">
            <GlassCard label="Time to Goal" value={`${timeToGoalMinutes}m`} />
            <GlassCard label="Burn Risk" value={burnRisk} />
            <GlassCard
              label="Daily Decay"
              value={`-${dailyDecay} IU`}
              subtext="Natural 15-day half-life"
            />
          </div>

          {/* Solar Window Chart */}
          <div className="mt-6">
            <SolarWindowChart
              uvCurve={sunData.uvCurve}
              currentHour={new Date().getHours()}
              sweetSpotStart={sunData.sweetSpotStart}
              sweetSpotEnd={sunData.sweetSpotEnd}
            />
          </div>

          {/* Supplement Quick-Add Card */}
          <div className="mt-4">
            <SupplementCard onSupplementLogged={handleSupplementLogged} />
          </div>

          {/* Cofactor Tracking Card */}
          <div className="mt-4">
            <CofactorCard onCofactorLogged={handleSupplementLogged} />
          </div>

          {/* Bask Now Button */}
          <div className="px-2 mt-8">
            <BaskNowButton
              preset={selectedPreset.name}
              onPress={handleStartSession}
              onPresetChange={() => setIsPresetSelectorOpen(true)}
            />
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
    </>
  );
}

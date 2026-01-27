'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { supplementsRepository } from '../../lib/database';

interface SupplementCardProps {
  onSupplementLogged?: () => void;
  todaySunIU?: number; // IU gained from sun today
  uvIndex?: number; // Current UV index
  vitaminDGoal?: number; // Daily goal in IU
}

const PRESET_DOSAGES = [1000, 2000, 5000]; // IU

/**
 * Card for quick-logging supplement intake
 * Shows checkmark animation on completion
 * Integrates with database for persistent storage
 * Features preset dosage buttons (1000, 2000, 5000 IU)
 * MOAT FEATURE: Weather-adjusted supplement recommendations
 */
export default function SupplementCard({
  onSupplementLogged,
  todaySunIU = 0,
  uvIndex = 0,
  vitaminDGoal = 5000,
}: SupplementCardProps) {
  const [todayTotalIU, setTodayTotalIU] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Calculate weather-adjusted recommendation
  const totalToday = todaySunIU + todayTotalIU;
  const remaining = Math.max(0, vitaminDGoal - totalToday);

  // Determine recommendation based on sun exposure and UV conditions
  const getRecommendation = (): { message: string; type: 'success' | 'warning' | 'info' } => {
    if (totalToday >= vitaminDGoal) {
      return {
        message: `You've hit your goal (${totalToday.toLocaleString()} IU)! Skip your supplement tonight to avoid over-supplementation.`,
        type: 'success',
      };
    }

    if (uvIndex < 2) {
      // Low/no UV day
      const suggestedDose = Math.min(5000, Math.ceil(remaining / 1000) * 1000);
      return {
        message: `No UV today (index ${uvIndex.toFixed(1)}). Consider a ${suggestedDose.toLocaleString()} IU top-up tonight.`,
        type: 'info',
      };
    }

    if (todaySunIU > 0 && remaining < 2000) {
      return {
        message: `You've almost reached your goal from sun exposure! ${remaining.toLocaleString()} IU more would complete it.`,
        type: 'success',
      };
    }

    if (todaySunIU === 0 && uvIndex >= 3) {
      return {
        message: `UV is ${uvIndex.toFixed(1)} outside! Get sun exposure first, then supplement if needed tonight.`,
        type: 'warning',
      };
    }

    const suggestedDose = Math.min(5000, Math.ceil(remaining / 1000) * 1000);
    return {
      message: `You have ${remaining.toLocaleString()} IU remaining. Consider ${suggestedDose.toLocaleString()} IU to reach your goal.`,
      type: 'info',
    };
  };

  const recommendation = getRecommendation();

  // Load today's supplement total
  useEffect(() => {
    loadTodayTotal();
  }, []);

  const loadTodayTotal = async () => {
    try {
      const total = await supplementsRepository.getTodayTotalIU();
      setTodayTotalIU(total);
    } catch (error) {
      console.error('Failed to load today total:', error);
    }
  };

  const handleLog = async (dosage: number) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }

    try {
      // Log the supplement to database
      await supplementsRepository.create(dosage);

      // Trigger animation
      setIsAnimating(true);

      // Update state
      setTodayTotalIU(prev => prev + dosage);

      // Hide presets after logging
      setShowPresets(false);

      // Notify parent component
      if (onSupplementLogged) {
        onSupplementLogged();
      }

      // Reset animation after it completes
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error('Failed to log supplement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasLoggedToday = todayTotalIU > 0;

  return (
    <div className="w-full px-4 py-3">
      <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
        {/* Header with status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {hasLoggedToday
                ? `Logged ${todayTotalIU} IU today!`
                : 'Log Vitamin D Supplement'}
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              {hasLoggedToday
                ? 'Add another dose if needed'
                : 'Select your dosage'}
            </p>
          </div>

          {/* Expand/Collapse indicator */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            disabled={isLoading}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-5 h-5 text-white transition-transform ${showPresets ? 'rotate-180' : ''}`}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </div>

        {/* Preset dosage buttons */}
        {showPresets && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
            {PRESET_DOSAGES.map((dosage) => (
              <button
                key={dosage}
                onClick={() => handleLog(dosage)}
                disabled={isLoading}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                  isLoading
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
                } ${isAnimating ? 'scale-95' : ''}`}>
                {dosage.toLocaleString()} IU
              </button>
            ))}
          </div>
        )}

        {/* Weather-Adjusted Recommendation (MOAT FEATURE) */}
        {showPresets && (
          <div className={`mt-3 p-3 rounded-xl ${
            recommendation.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
            recommendation.type === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' :
            'bg-blue-500/20 border border-blue-500/30'
          }`}>
            <div className="flex gap-2 items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  recommendation.type === 'success' ? 'text-green-300' :
                  recommendation.type === 'warning' ? 'text-amber-300' :
                  'text-blue-300'
                }`}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                />
              </svg>
              <p className="text-xs text-white leading-relaxed">{recommendation.message}</p>
            </div>
          </div>
        )}

        {/* Educational tip */}
        {showPresets && (
          <p className="text-xs text-white/60 mt-3 leading-relaxed">
            💡 Vitamin D is best absorbed with a meal containing fat. Take with breakfast or lunch for optimal results.
          </p>
        )}
      </div>
    </div>
  );
}

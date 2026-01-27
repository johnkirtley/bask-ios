'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { supplementsRepository } from '../../lib/database';

interface SupplementCardProps {
  onSupplementLogged?: () => void;
}

const PRESET_DOSAGES = [1000, 2000, 5000]; // IU

/**
 * Card for quick-logging supplement intake
 * Shows checkmark animation on completion
 * Integrates with database for persistent storage
 * Features preset dosage buttons (1000, 2000, 5000 IU)
 */
export default function SupplementCard({ onSupplementLogged }: SupplementCardProps) {
  const [todayTotalIU, setTodayTotalIU] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

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

'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getMockSupplementData, logSupplementIntake } from '../../lib/mockData';

/**
 * Card for quick-logging supplement intake
 * Shows checkmark animation on completion
 */
export default function SupplementCard() {
  const [supplementData, setSupplementData] = useState(() => getMockSupplementData());
  const [isAnimating, setIsAnimating] = useState(false);

  // Refresh supplement status on mount
  useEffect(() => {
    setSupplementData(getMockSupplementData());
  }, []);

  const handleLog = async () => {
    if (supplementData.isLoggedToday) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }

    // Log the supplement
    logSupplementIntake();

    // Trigger animation
    setIsAnimating(true);

    // Update state
    setSupplementData({
      ...supplementData,
      isLoggedToday: true,
    });

    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="w-full px-4 py-3">
      <div className="bg-cloud-white/40 backdrop-blur-sm rounded-2xl p-4 border border-border-light/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-deep-charcoal">
              {supplementData.isLoggedToday
                ? `Logged ${supplementData.amount} ${supplementData.unit} today!`
                : `Log your ${supplementData.amount} ${supplementData.unit} supplement?`}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {supplementData.isLoggedToday
                ? 'Great job staying on track!'
                : 'Tap to record your vitamin D intake'}
            </p>
          </div>

          {/* Check button */}
          <button
            onClick={handleLog}
            disabled={supplementData.isLoggedToday}
            className={`ml-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              supplementData.isLoggedToday
                ? 'bg-solar-amber shadow-sm'
                : 'bg-border-light/50 hover:bg-border-light active:scale-95'
            }`}>
            {supplementData.isLoggedToday ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className={`w-6 h-6 text-deep-charcoal ${isAnimating ? 'check-animation' : ''}`}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-text-secondary">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

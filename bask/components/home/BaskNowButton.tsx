'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface BaskNowButtonProps {
  preset: string;
  onPress?: () => void;
  onPresetChange?: () => void;
}

/**
 * Large call-to-action button to start a basking session
 * Shows current clothing preset above the button
 */
export default function BaskNowButton({
  preset,
  onPress,
  onPresetChange,
}: BaskNowButtonProps) {
  const handlePress = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available (web preview)
    }

    if (onPress) {
      onPress();
    } else {
      // Default action: show alert (for now)
      alert('Bask session starting! (This will trigger timer and Live Activity)');
    }
  };

  const handlePresetChange = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available
    }

    if (onPresetChange) {
      onPresetChange();
    } else {
      // Default action: show alert
      alert('Preset selector coming soon!');
    }
  };

  return (
    <div className="w-full px-4 py-4">
      {/* Preset selector */}
      <button
        onClick={handlePresetChange}
        className="w-full text-center mb-2 py-2 active:opacity-70 transition-opacity">
        <span className="text-xs text-text-secondary">Current Preset:</span>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <span className="text-sm font-semibold text-white">
            {preset}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-solar-amber">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </div>
      </button>

      {/* Main CTA button */}
      <button
        onClick={handlePress}
        className="bask-button w-full py-5 bg-solar-amber text-deep-charcoal rounded-full text-lg font-bold shadow-lg active:shadow-md">
        Bask Now
      </button>

      <p className="text-xs text-text-secondary text-center mt-3">
        Tap to start tracking your sun exposure
      </p>
    </div>
  );
}

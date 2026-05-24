'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface BaskNowButtonProps {
  preset: string;
  onPress?: () => void;
  onPresetChange?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Large call-to-action button to start a basking session
 * Shows current clothing preset above the button
 */
export default function BaskNowButton({
  preset,
  onPress,
  onPresetChange,
  disabled = false,
  disabledReason,
}: BaskNowButtonProps) {
  const handlePress = async () => {
    if (disabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available (web preview)
    }

    if (onPress) {
      onPress();
    } else {
      // Default action: show alert (for now)
      alert(
        'Bask session starting! (This will trigger timer and Live Activity)',
      );
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
    <div className='w-full py-4'>
      {/* Preset selector - pill style */}
      <div className='flex flex-col items-center mb-4'>
        <button
          onClick={handlePresetChange}
          aria-label={`Change clothing preset. Currently wearing: ${preset}`}
          className='flex items-center justify-center gap-1.5 px-3 py-2 bg-black/5 rounded-full active:bg-black/10 transition-colors min-h-[44px]'>
          <span className='text-xs font-medium text-text-secondary'>
            Wearing:
          </span>
          <span className='text-xs font-semibold text-text-primary'>
            {preset}
          </span>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className='w-3.5 h-3.5 text-text-secondary'
            aria-hidden='true'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M19.5 8.25l-7.5 7.5-7.5-7.5'
            />
          </svg>
        </button>
        <p className='text-[11px] text-text-secondary text-center mt-1.5 max-w-[220px]'>
          Changing skin exposure updates your IU rate, time-to-goal, and
          recommendations
        </p>
      </div>

      {/* Main CTA button */}
      <button
        onClick={handlePress}
        disabled={disabled}
        aria-disabled={disabled}
        className={`bask-button w-full py-5 rounded-full text-lg font-bold shadow-lg active:shadow-md ${
          disabled
            ? 'bg-black/10 text-text-muted cursor-not-allowed'
            : 'bg-solar-flare text-[#4A2800]'
        }`}>
        Bask Now
      </button>

      <p className='text-xs text-text-secondary text-center mt-3'>
        {disabled && disabledReason
          ? disabledReason
          : 'Tap to start tracking your sun exposure'}
      </p>
    </div>
  );
}

'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { capture, ANALYTICS_EVENTS } from '../../lib/analytics';

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
    capture(ANALYTICS_EVENTS.clothingEditorOpened);

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
      {/* Clothing preset chip */}
      <div className='flex justify-center mb-4'>
        <button
          onClick={handlePresetChange}
          aria-label={`Change clothing preset. Currently wearing: ${preset}`}
          className='flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-[0_4px_14px_rgba(40,30,10,0.07)] active:scale-[0.98] transition-all min-h-[44px]'>
          {/* Person icon */}
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.8} stroke='currentColor' className='w-4 h-4 text-text-secondary' aria-hidden='true'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' />
          </svg>
          <span className='text-sm font-bold text-text-primary'>
            Wearing:
          </span>
          <span className='text-sm font-bold text-solar-warm'>
            {preset}
          </span>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2.5} stroke='currentColor' className='w-3 h-3 text-text-secondary' aria-hidden='true'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' />
          </svg>
        </button>
      </div>

      {/* Main CTA button — gradient pill with glow */}
      <button
        onClick={handlePress}
        disabled={disabled}
        aria-disabled={disabled}
        className={`bask-button w-full py-5 rounded-full text-xl font-black tracking-[-0.01em] flex items-center justify-center gap-2 ${
          disabled
            ? 'bg-black/10 text-text-muted cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-[#FFC93C] to-[#F4A536] text-[#2A2419] shadow-[0_12px_30px_rgba(244,165,54,0.33),0_0_0_1px_rgba(255,255,255,0.4)_inset] active:shadow-[0_6px_15px_rgba(244,165,54,0.25)]'
        }`}>
        {!disabled && <span className="w-3 h-3 rounded-full bg-[#2A2419] opacity-80" aria-hidden="true" />}
        Bask Now
      </button>

      <p className='text-sm text-text-secondary text-center mt-3'>
        {disabled && disabledReason
          ? disabledReason
          : 'Tap to start tracking your sun exposure'}
      </p>
    </div>
  );
}

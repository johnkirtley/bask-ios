'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { capture, ANALYTICS_EVENTS } from '../../lib/analytics';

type BaskCtaVariant = 'vitaminD' | 'morningLight' | 'lowUv' | 'night';

interface BaskNowButtonProps {
  preset: string;
  onPress?: () => void;
  onPresetChange?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  /** Button label, phase-aware (e.g. "Get your morning light"). Defaults to "Bask Now". */
  label?: string;
  /** Helper line under the button when enabled. */
  helper?: string;
  /** Drives the accent treatment by phase. */
  variant?: BaskCtaVariant;
}

// Enabled gradient + leading glyph per phase. Morning light / low-UV get a softer
// "dawn" gradient so the hero re-skins without leaving Bask's warm palette.
const VARIANT_GRADIENT: Record<BaskCtaVariant, string> = {
  vitaminD:
    'bg-gradient-to-r from-[#FFC93C] to-[#F4A536] text-[#2A2419] shadow-[0_12px_30px_rgba(244,165,54,0.33),0_0_0_1px_rgba(255,255,255,0.4)_inset] active:shadow-[0_6px_15px_rgba(244,165,54,0.25)]',
  night:
    'bg-gradient-to-r from-[#FFC93C] to-[#F4A536] text-[#2A2419] shadow-[0_12px_30px_rgba(244,165,54,0.33),0_0_0_1px_rgba(255,255,255,0.4)_inset] active:shadow-[0_6px_15px_rgba(244,165,54,0.25)]',
  morningLight:
    'bg-gradient-to-r from-[#FFE1A8] via-[#FFC56E] to-[#F4A94A] text-[#2A2419] shadow-[0_12px_30px_rgba(244,165,54,0.28),0_0_0_1px_rgba(255,255,255,0.5)_inset] active:shadow-[0_6px_15px_rgba(244,165,54,0.22)]',
  lowUv:
    'bg-gradient-to-r from-[#F1E4C4] to-[#E2CE9C] text-[#2A2419] shadow-[0_10px_26px_rgba(120,100,50,0.18),0_0_0_1px_rgba(255,255,255,0.5)_inset] active:shadow-[0_5px_13px_rgba(120,100,50,0.14)]',
};

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
  label = 'Bask Now',
  helper = 'Tap to start tracking your sun exposure',
  variant = 'vitaminD',
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
        className={`bask-button w-full py-5 rounded-full text-xl font-black tracking-[-0.01em] whitespace-nowrap flex items-center justify-center gap-2 ${
          disabled
            ? 'bg-black/10 text-text-muted cursor-not-allowed shadow-none'
            : VARIANT_GRADIENT[variant]
        }`}>
        {!disabled &&
          (variant === 'morningLight' ? (
            // Sunrise glyph: half-sun rising over a horizon line.
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2.2}
              strokeLinecap='round'
              strokeLinejoin='round'
              className='w-5 h-5'
              aria-hidden='true'>
              <path d='M17 18a5 5 0 0 0-10 0' />
              <line x1='12' y1='2' x2='12' y2='6' />
              <line x1='4.2' y1='9.2' x2='5.6' y2='10.6' />
              <line x1='19.8' y1='9.2' x2='18.4' y2='10.6' />
              <line x1='2' y1='18' x2='22' y2='18' />
              <line x1='8' y1='5' x2='9' y2='6' />
            </svg>
          ) : (
            <span className='w-3 h-3 rounded-full bg-[#2A2419] opacity-80' aria-hidden='true' />
          ))}
        {label}
      </button>

      <p className='text-sm text-text-secondary text-center mt-3'>
        {disabled && disabledReason ? disabledReason : helper}
      </p>
    </div>
  );
}

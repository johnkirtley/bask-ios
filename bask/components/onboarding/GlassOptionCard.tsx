'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface GlassOptionCardProps {
  label: string;
  description?: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function GlassOptionCard({
  label,
  description,
  isSelected,
  onSelect,
}: GlassOptionCardProps) {
  const handlePress = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onSelect();
  };

  return (
    <button
      onClick={handlePress}
      className={`
        relative w-full backdrop-blur-xl rounded-2xl p-5 border-2
        transition-all duration-200 active:scale-[0.98]
        ${
          isSelected
            ? 'bg-golden-glow/10 border-golden-glow glass-card-selected'
            : 'bg-white/10 border-white/20'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 text-left">
          <div className="text-[17px] font-medium text-text-primary">{label}</div>
          {description && (
            <div className="text-[14px] text-text-secondary mt-1">{description}</div>
          )}
        </div>

        {/* Checkmark indicator */}
        <div
          className={`
            ml-3 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-all duration-200
            ${
              isSelected
                ? 'bg-golden-glow border-golden-glow'
                : 'border-white/40 bg-transparent'
            }
          `}
        >
          {isSelected && (
            <svg
              className="w-4 h-4 text-dark-bg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AnswerOptionProps {
  label: string;
  description?: string;
  isSelected: boolean;
  onToggle: () => void;
}

export default function AnswerOption({
  label,
  description,
  isSelected,
  onToggle,
}: AnswerOptionProps) {
  const handlePress = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback - no haptics
    }
    onToggle();
  };

  return (
    <button
      onClick={handlePress}
      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
        isSelected
          ? 'border-olive bg-olive/5'
          : 'border-border-warm bg-oat hover:border-umber/20'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p
            className={`text-[17px] font-semibold ${
              isSelected ? 'text-olive' : 'text-umber'
            }`}
          >
            {label}
          </p>
          {description && (
            <p className="text-sm text-umber-muted mt-0.5">{description}</p>
          )}
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? 'border-olive bg-olive'
              : 'border-border-warm bg-transparent'
          }`}
        >
          {isSelected && (
            <svg
              className="w-3.5 h-3.5 text-oat"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

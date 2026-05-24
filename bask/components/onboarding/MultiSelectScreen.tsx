'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingOption } from '../../lib/onboardingData';

interface MultiSelectScreenProps {
  title: string;
  subtitle?: string;
  options: OnboardingOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onContinue: () => void;
}

export default function MultiSelectScreen({
  title,
  subtitle,
  options,
  selectedValues,
  onToggle,
  onContinue,
}: MultiSelectScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  const isContinueDisabled = selectedValues.length === 0;

  return (
    <div className="flex flex-col flex-1 h-full px-6 pt-6 relative overflow-hidden">
      {/* Atmospheric gradient background - soft warm */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{title}</h2>
          {subtitle && <p className="text-sm text-gray-700">{subtitle}</p>}
        </div>

        {/* Options */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-4">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={async () => {
                  await Haptics.impact({ style: ImpactStyle.Light });
                  onToggle(option.value);
                }}
                className={`
                  relative flex items-center gap-4 p-4 rounded-2xl text-left
                  transition-all duration-200
                  ${isSelected ? 'bg-white/90 shadow-lg' : 'bg-white/60'}
                `}
              >
                <div className="flex-1">
                  <div className="text-base font-semibold text-gray-900">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                  )}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-grove-green flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-6">
          <button
            onClick={handleContinue}
            disabled={isContinueDisabled}
            className={`
              w-full py-4 rounded-full text-[17px] font-semibold
              transition-all duration-200
              ${
                isContinueDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white active:scale-[0.98] shadow-lg'
              }
            `}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

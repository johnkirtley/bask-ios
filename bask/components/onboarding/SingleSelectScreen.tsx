'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import GlassOptionCard from './GlassOptionCard';
import { OnboardingOption } from '../../lib/onboardingData';

interface SingleSelectScreenProps {
  title: string;
  subtitle?: string;
  options: OnboardingOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onContinue: () => void;
}

export default function SingleSelectScreen({
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  onContinue,
}: SingleSelectScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  const isContinueDisabled = !selectedValue;

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-safe">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-title text-[28px] leading-tight text-white mb-2">{title}</h2>
        {subtitle && <p className="text-[15px] text-text-secondary">{subtitle}</p>}
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {options.map((option) => (
          <GlassOptionCard
            key={option.value}
            label={option.label}
            description={option.description}
            isSelected={selectedValue === option.value}
            onSelect={() => onSelect(option.value)}
          />
        ))}
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
                ? 'bg-golden-glow/30 text-white/50 cursor-not-allowed'
                : 'bg-golden-glow text-dark-bg active:scale-[0.98]'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

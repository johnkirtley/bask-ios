'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import ColorSwatch from './ColorSwatch';
import { skinToneOptions, eyeColorOptions } from '../../lib/onboardingData';

interface SkinEyeColorScreenProps {
  skinTone: string | null;
  eyeColor: string | null;
  onSkinToneSelect: (value: string) => void;
  onEyeColorSelect: (value: string) => void;
  onContinue: () => void;
}

export default function SkinEyeColorScreen({
  skinTone,
  eyeColor,
  onSkinToneSelect,
  onEyeColorSelect,
  onContinue,
}: SkinEyeColorScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  const isContinueDisabled = !skinTone || !eyeColor;

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-safe">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-title text-[28px] leading-tight text-white">
          What is your natural, unexposed skin and eye color?
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 flex flex-col gap-8 overflow-y-auto">
        {/* Skin Tone Section */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20">
          <h3 className="text-[17px] font-semibold text-white mb-4">Skin Tone</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {skinToneOptions.map((option) => (
              <ColorSwatch
                key={option.value}
                color={option.colorHex!}
                label={option.label}
                isSelected={skinTone === option.value}
                onSelect={() => onSkinToneSelect(option.value)}
                size="md"
              />
            ))}
          </div>
        </div>

        {/* Eye Color Section */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20">
          <h3 className="text-[17px] font-semibold text-white mb-4">Eye Color</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {eyeColorOptions.map((option) => (
              <ColorSwatch
                key={option.value}
                color={option.colorHex!}
                label={option.label}
                isSelected={eyeColor === option.value}
                onSelect={() => onEyeColorSelect(option.value)}
                size="md"
              />
            ))}
          </div>
        </div>
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

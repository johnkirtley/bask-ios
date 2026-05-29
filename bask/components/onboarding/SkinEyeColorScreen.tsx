'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { eyeColorOptions } from '../../lib/onboardingData';
import {
  WarmBody,
  WarmCTA,
  WarmHeadline,
  WarmSub,
  WarmSwatchCard,
} from './warm/atoms';

interface SkinEyeColorScreenProps {
  skinTone: string | null;
  eyeColor: string | null;
  onSkinToneSelect: (value: string) => void;
  onEyeColorSelect: (value: string) => void;
  onContinue: () => void;
}

const fitzpatrickTypes = [
  { value: 'very-fair', roman: 'I', colorHex: '#F9EBDD' },
  { value: 'fair', roman: 'II', colorHex: '#EFD3B1' },
  { value: 'medium', roman: 'III', colorHex: '#D5A77F' },
  { value: 'olive', roman: 'IV', colorHex: '#9B6338' },
  { value: 'brown', roman: 'V', colorHex: '#6B3E26' },
  { value: 'dark-brown', roman: 'VI', colorHex: '#3C2016' },
];

export default function SkinEyeColorScreen({
  skinTone,
  eyeColor,
  onSkinToneSelect,
  onEyeColorSelect,
  onContinue,
}: SkinEyeColorScreenProps) {
  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  const tap = async (fn: () => void) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    fn();
  };

  return (
    <WarmBody
      footer={
        <WarmCTA onClick={handleContinue} disabled={!skinTone}>
          Continue
        </WarmCTA>
      }
    >
      <div className="warm-step-in">
        <WarmHeadline size={27}>How sensitive is your skin to the sun?</WarmHeadline>
        <WarmSub>Your skin tone and eye color together calibrate how quickly you make vitamin D, and how soon you burn.</WarmSub>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 20,
          }}
        >
          {fitzpatrickTypes.map((type) => (
            <WarmSwatchCard
              key={type.value}
              color={type.colorHex}
              title={`Type ${type.roman}`}
              selected={skinTone === type.value}
              onClick={() => tap(() => onSkinToneSelect(type.value))}
            />
          ))}
        </div>

        <div style={{ marginTop: 26 }}>
          <WarmHeadline size={20}>Eye color</WarmHeadline>
          <WarmSub>Lighter eyes often signal more sun-sensitive skin.</WarmSub>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              marginTop: 14,
            }}
          >
            {eyeColorOptions.map((opt) => (
              <WarmSwatchCard
                key={opt.value}
                color={opt.colorHex ?? '#888'}
                title={opt.label}
                selected={eyeColor === opt.value}
                onClick={() => tap(() => onEyeColorSelect(opt.value))}
              />
            ))}
          </div>
        </div>
      </div>
    </WarmBody>
  );
}

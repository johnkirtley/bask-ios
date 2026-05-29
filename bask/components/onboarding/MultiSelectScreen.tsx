'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingOption } from '../../lib/onboardingData';
import {
  WarmBody,
  WarmCTA,
  WarmHeadline,
  WarmOption,
  WarmSub,
} from './warm/atoms';

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
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  const isContinueDisabled = selectedValues.length === 0;

  return (
    <WarmBody
      footer={
        <WarmCTA onClick={handleContinue} disabled={isContinueDisabled}>
          Continue
        </WarmCTA>
      }
    >
      <div className="warm-step-in">
        <WarmHeadline size={27}>{title}</WarmHeadline>
        {subtitle && <WarmSub>{subtitle}</WarmSub>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {options.map((option) => (
            <WarmOption
              key={option.value}
              multi
              icon={option.icon}
              label={option.label}
              sub={option.description}
              selected={selectedValues.includes(option.value)}
              onClick={async () => {
                try {
                  await Haptics.impact({ style: ImpactStyle.Light });
                } catch {
                  // Web fallback
                }
                onToggle(option.value);
              }}
            />
          ))}
        </div>
      </div>
    </WarmBody>
  );
}

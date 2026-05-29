'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingOption } from '../../lib/onboardingData';
import { CitationId } from '../../lib/onboarding/citations';
import {
  WarmBody,
  WarmCTA,
  WarmCite,
  WarmHeadline,
  WarmOption,
  WarmSub,
} from './warm/atoms';

interface SingleSelectScreenProps {
  title: string;
  subtitle?: string;
  options: OnboardingOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onContinue: () => void;
  citationId?: CitationId;
}

export default function SingleSelectScreen({
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  onContinue,
  citationId,
}: SingleSelectScreenProps) {
  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  return (
    <WarmBody
      footer={
        <WarmCTA onClick={handleContinue} disabled={!selectedValue}>
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
              icon={option.icon}
              label={option.label}
              sub={option.description}
              selected={selectedValue === option.value}
              onClick={async () => {
                try {
                  await Haptics.impact({ style: ImpactStyle.Light });
                } catch {
                  // Web fallback
                }
                onSelect(option.value);
              }}
            />
          ))}
        </div>

        {citationId && (
          <div style={{ marginTop: 18 }}>
            <WarmCite id={citationId} />
          </div>
        )}
      </div>
    </WarmBody>
  );
}

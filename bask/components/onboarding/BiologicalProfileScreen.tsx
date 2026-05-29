'use client';

import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  WARM,
  WarmBody,
  WarmCTA,
  WarmHeadline,
  WarmInputCard,
  WarmSub,
} from './warm/atoms';

interface BiologicalProfileScreenProps {
  age: number | null;
  weight: number | null;
  weightUnit: 'lbs' | 'kg';
  onAgeChange: (age: number | null) => void;
  onWeightChange: (weight: number | null) => void;
  onWeightUnitChange: (unit: 'lbs' | 'kg') => void;
  onContinue: () => void;
}

export default function BiologicalProfileScreen({
  age,
  weight,
  weightUnit,
  onAgeChange,
  onWeightChange,
  onWeightUnitChange,
  onContinue,
}: BiologicalProfileScreenProps) {
  const [ageInput, setAgeInput] = useState(age?.toString() ?? '');
  const [weightInput, setWeightInput] = useState(weight?.toString() ?? '');

  const handleAgeChange = (value: string) => {
    setAgeInput(value);
    const numValue = parseInt(value, 10);
    if (value === '') {
      onAgeChange(null);
    } else if (!isNaN(numValue) && numValue >= 18 && numValue <= 100) {
      onAgeChange(numValue);
    }
  };

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const numValue = parseFloat(value);
    if (value === '') {
      onWeightChange(null);
    } else if (!isNaN(numValue) && numValue > 0 && numValue < 1000) {
      onWeightChange(numValue);
    }
  };

  const handleWeightUnitToggle = async (unit: string) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    onWeightUnitChange(unit as 'lbs' | 'kg');
  };

  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  return (
    <WarmBody footer={<WarmCTA onClick={handleContinue}>Continue</WarmCTA>}>
      <div className="warm-step-in">
        <WarmHeadline size={27}>A few quick details</WarmHeadline>
        <WarmSub>Optional, but they help us fine-tune your vitamin D needs.</WarmSub>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          <WarmInputCard
            label="Age (18 to 100)"
            placeholder="Optional"
            value={ageInput}
            onChange={handleAgeChange}
          />
          <WarmInputCard
            label="Weight"
            placeholder="Optional"
            value={weightInput}
            onChange={handleWeightChange}
            unitToggle={['lbs', 'kg']}
            unit={weightUnit}
            onUnit={handleWeightUnitToggle}
          />

          <div
            style={{
              background: WARM.sun + '1f',
              borderRadius: 16,
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.5,
                color: WARM.ink + 'cc',
              }}
            >
              Vitamin D is fat-soluble, so body composition affects your storage and metabolism.
              Age also influences how efficiently your skin synthesizes it.
            </p>
          </div>
        </div>
      </div>
    </WarmBody>
  );
}

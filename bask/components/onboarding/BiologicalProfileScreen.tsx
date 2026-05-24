'use client';

import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

  const handleWeightUnitToggle = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    const newUnit = weightUnit === 'lbs' ? 'kg' : 'lbs';
    onWeightUnitChange(newUnit);
  };

  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  return (
    <div className="flex flex-col flex-1 min-h-full px-6 pt-6 pb-8 relative overflow-y-auto">
      {/* Atmospheric gradient background */}
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
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
            A few quick details for accurate recommendations
          </h2>
          <p className="text-base text-gray-700">
            These are optional but help us personalize your vitamin D needs
          </p>
        </div>

      {/* Input Fields */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Age Input */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-black/5 shadow-sm rounded-2xl p-5">
          <label className="block text-[15px] text-text-secondary mb-2">Age (18-100)</label>
          <input
            type="number"
            inputMode="numeric"
            min="18"
            max="100"
            value={ageInput}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder="Optional"
            className="w-full bg-transparent text-text-primary text-[20px] font-medium outline-none placeholder:text-text-primary/40"
          />
        </div>

        {/* Weight Input with Unit Toggle */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-black/5 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[15px] text-text-secondary">Weight</label>
            {/* Unit Toggle */}
            <button
              onClick={handleWeightUnitToggle}
              className="flex items-center gap-2 backdrop-blur-xl bg-black/5 border border-black/10 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
            >
              <span
                className={`text-[13px] font-medium transition-colors ${
                  weightUnit === 'lbs' ? 'text-solar-flare' : 'text-text-primary/60'
                }`}
              >
                lbs
              </span>
              <div className="w-px h-3 bg-white/30" />
              <span
                className={`text-[13px] font-medium transition-colors ${
                  weightUnit === 'kg' ? 'text-solar-flare' : 'text-text-primary/60'
                }`}
              >
                kg
              </span>
            </button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="999"
            value={weightInput}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="Optional"
            className="w-full bg-transparent text-text-primary text-[20px] font-medium outline-none placeholder:text-text-primary/40"
          />
        </div>

        {/* Info Note */}
        <div className="backdrop-blur-xl bg-golden-glow/5 border border-golden-glow/30 rounded-xl p-4">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Vitamin D is fat-soluble, meaning body composition affects your storage capacity and
            metabolism. Age also influences synthesis efficiency.
          </p>
        </div>
      </div>

        {/* Continue button */}
        <div className="mt-6">
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-full text-[17px] font-semibold bg-black text-white active:scale-[0.98] transition-all duration-200 shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

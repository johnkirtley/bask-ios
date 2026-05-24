'use client';

import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface BloodTestScreenProps {
  hasBloodTest: boolean;
  bloodTestValue: number | null;
  bloodTestUnit: 'ng/mL' | 'nmol/L';
  bloodTestDate: string | null;
  onUpdate: (data: {
    hasBloodTest: boolean;
    bloodTestValue: number | null;
    bloodTestUnit: 'ng/mL' | 'nmol/L';
    bloodTestDate: string | null;
  }) => void;
  onContinue: () => void;
}

export default function BloodTestScreen({
  hasBloodTest,
  bloodTestValue,
  bloodTestUnit,
  bloodTestDate,
  onUpdate,
  onContinue,
}: BloodTestScreenProps) {
  const [selectedOption, setSelectedOption] = useState<
    'yes' | 'no' | 'manual' | null
  >(
    hasBloodTest === false
      ? 'no'
      : hasBloodTest && bloodTestValue
      ? 'manual'
      : null,
  );
  const [value, setValue] = useState<string>(bloodTestValue?.toString() || '');
  const [unit, setUnit] = useState<'ng/mL' | 'nmol/L'>(bloodTestUnit);
  const [date, setDate] = useState<string>(
    bloodTestDate || new Date().toISOString().split('T')[0],
  );

  const handleOptionSelect = async (option: 'yes' | 'no' | 'manual') => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}

    setSelectedOption(option);

    if (option === 'no') {
      // User doesn't have blood test - use default estimation
      onUpdate({
        hasBloodTest: false,
        bloodTestValue: null,
        bloodTestUnit: 'ng/mL',
        bloodTestDate: null,
      });
    } else if (option === 'yes') {
      // User will connect HealthKit (future feature)
      onUpdate({
        hasBloodTest: true,
        bloodTestValue: null,
        bloodTestUnit: 'ng/mL',
        bloodTestDate: null,
      });
    }
  };

  const handleManualSubmit = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    onUpdate({
      hasBloodTest: true,
      bloodTestValue: numValue,
      bloodTestUnit: unit,
      bloodTestDate: date,
    });

    onContinue();
  };

  const handleSkipToNext = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    if (selectedOption === 'yes' || selectedOption === 'no') {
      onContinue();
    }
  };

  const canContinue = selectedOption === 'yes' || selectedOption === 'no';
  const canSubmitManual =
    selectedOption === 'manual' && value && parseFloat(value) > 0;

  return (
    <div className='flex flex-col flex-1 min-h-full px-6 pt-6 pb-8 relative overflow-y-auto'>
      {/* Atmospheric gradient background */}
      <div
        className='fixed inset-0 pointer-events-none'
        style={{
          background:
            'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

      {/* Content */}
      <div className='relative z-10 flex flex-col min-h-full'>
        {/* Header */}
        <div className='mb-6'>
          <h2 className='text-2xl font-bold text-gray-900 leading-tight mb-2'>
            Do you know your vitamin D level?
          </h2>
          <p className='text-[15px] text-text-secondary'>
            Blood test results help us calibrate your baseline more accurately
          </p>
        </div>

        {/* Options */}
        <div className='flex-1 space-y-3'>
          {/* Option 1: Connect HealthKit */}
          <button
            onClick={() => handleOptionSelect('yes')}
            className={`w-full p-5 rounded-2xl text-left transition-all ${
              selectedOption === 'yes'
                ? 'backdrop-blur-xl bg-golden-glow/20 border-2 border-solar-flare'
                : 'backdrop-blur-xl bg-white/60 border-2 border-black/5 active:scale-[0.98]'
            }`}>
            <div className='flex items-start gap-3'>
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === 'yes'
                    ? 'border-solar-flare bg-golden-glow'
                    : 'border-white/40'
                }`}>
                {selectedOption === 'yes' && (
                  <svg
                    className='w-4 h-4 text-dark-bg'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={3}>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-text-primary font-semibold text-[17px] mb-1'>
                  Yes, sync from Apple Health
                </h3>
                <p className='text-text-secondary text-sm'>
                  We&apos;ll read your vitamin D levels from HealthKit
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Manual Entry */}
          <button
            onClick={() => handleOptionSelect('manual')}
            className={`w-full p-5 rounded-2xl text-left transition-all ${
              selectedOption === 'manual'
                ? 'backdrop-blur-xl bg-golden-glow/20 border-2 border-solar-flare'
                : 'backdrop-blur-xl bg-white/60 border-2 border-black/5 active:scale-[0.98]'
            }`}>
            <div className='flex items-start gap-3'>
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === 'manual'
                    ? 'border-solar-flare bg-golden-glow'
                    : 'border-white/40'
                }`}>
                {selectedOption === 'manual' && (
                  <svg
                    className='w-4 h-4 text-dark-bg'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={3}>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-text-primary font-semibold text-[17px] mb-1'>
                  Yes, I&apos;ll enter it manually
                </h3>
                <p className='text-text-secondary text-sm'>
                  Input your 25(OH)D blood test result
                </p>
              </div>
            </div>
          </button>

          {/* Manual Entry Form */}
          {selectedOption === 'manual' && (
            <div className='backdrop-blur-xl bg-white/60 rounded-xl p-4 border border-black/5 space-y-4'>
              <div>
                <label className='text-text-primary text-sm font-medium mb-2 block'>
                  25(OH)D Level
                </label>
                <input
                  type='number'
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder='Enter value'
                  className='w-full px-4 py-3 rounded-xl bg-white/40 border border-black/10 text-text-primary placeholder-text-secondary focus:outline-none focus:border-solar-flare'
                />
              </div>

              <div>
                <label className='text-text-primary text-sm font-medium mb-2 block'>
                  Unit
                </label>
                <div className='flex gap-2'>
                  <button
                    onClick={() => setUnit('ng/mL')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      unit === 'ng/mL'
                        ? 'bg-solar-flare text-white'
                        : 'bg-black/5 text-text-secondary'
                    }`}>
                    ng/mL
                  </button>
                  <button
                    onClick={() => setUnit('nmol/L')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      unit === 'nmol/L'
                        ? 'bg-solar-flare text-white'
                        : 'bg-black/5 text-text-secondary'
                    }`}>
                    nmol/L
                  </button>
                </div>
              </div>

              <div>
                <label className='text-text-primary text-sm font-medium mb-2 block'>
                  Test Date
                </label>
                <div className='overflow-hidden max-w-full'>
                  <input
                    type='date'
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className='w-full max-w-full px-4 py-3 rounded-xl bg-white/40 border border-black/10 text-text-primary focus:outline-none focus:border-solar-flare box-border'
                  />
                </div>
              </div>

              <p className='text-xs text-text-secondary'>
                💡 Optimal range: 40-60 ng/mL (100-150 nmol/L)
              </p>
            </div>
          )}

          {/* Option 3: No Test */}
          <button
            onClick={() => handleOptionSelect('no')}
            className={`w-full p-5 rounded-2xl text-left transition-all ${
              selectedOption === 'no'
                ? 'backdrop-blur-xl bg-golden-glow/20 border-2 border-solar-flare'
                : 'backdrop-blur-xl bg-white/60 border-2 border-black/5 active:scale-[0.98]'
            }`}>
            <div className='flex items-start gap-3'>
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === 'no'
                    ? 'border-solar-flare bg-golden-glow'
                    : 'border-white/40'
                }`}>
                {selectedOption === 'no' && (
                  <svg
                    className='w-4 h-4 text-dark-bg'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={3}>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-text-primary font-semibold text-[17px] mb-1'>
                  No, I don&apos;t have one
                </h3>
                <p className='text-text-secondary text-sm'>
                  We&apos;ll use a conservative baseline estimate based on your
                  profile
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Continue button */}
        <div className='mt-6'>
          {selectedOption === 'manual' ? (
            <button
              onClick={handleManualSubmit}
              disabled={!canSubmitManual}
              className={`w-full py-4 rounded-full text-[17px] font-semibold transition-all shadow-lg ${
                canSubmitManual
                  ? 'bg-black text-white active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}>
              Continue
            </button>
          ) : (
            <button
              onClick={handleSkipToNext}
              disabled={!canContinue}
              className={`w-full py-4 rounded-full text-[17px] font-semibold transition-all shadow-lg ${
                canContinue
                  ? 'bg-black text-white active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

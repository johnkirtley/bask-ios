'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

  const isContinueDisabled = !skinTone;

  // Fitzpatrick type mapping with descriptive labels
  const fitzpatrickTypes = [
    { value: 'very-fair', label: 'Type I', subtitle: 'Pale white or freckled', colorHex: '#F9EBDD' },
    { value: 'fair', label: 'Type II', subtitle: 'White or fair', colorHex: '#EFD3B1' },
    { value: 'medium', label: 'Type III', subtitle: 'Creamy white or light-medium', colorHex: '#D5A77F' },
    { value: 'olive', label: 'Type IV', subtitle: 'Olive or light brown', colorHex: '#9B6338' },
    { value: 'brown', label: 'Type V', subtitle: 'Brown or dark brown', colorHex: '#6B3E26' },
    { value: 'dark-brown', label: 'Type VI', subtitle: 'Deeply pigmented', colorHex: '#3C2016' },
  ];

  return (
    <div className="flex flex-col flex-1 h-full px-6 pt-6 relative overflow-hidden">
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
            Which best describes your skin type?
          </h2>
          <p className="text-base text-gray-700">
            Choose one to see full description
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-3 gap-3">
            {fitzpatrickTypes.map((type) => {
              const isSelected = skinTone === type.value;
              return (
                <button
                  key={type.value}
                  onClick={async () => {
                    await Haptics.impact({ style: ImpactStyle.Light });
                    onSkinToneSelect(type.value);
                  }}
                  className={`
                    relative flex flex-col items-center gap-3 p-4 rounded-2xl
                    transition-all duration-200
                    ${isSelected ? 'bg-white/90 shadow-lg scale-105' : 'bg-white/50'}
                  `}
                >
                  {/* Skin tone circle */}
                  <div
                    className="w-16 h-16 rounded-full border-2 transition-all duration-200"
                    style={{
                      backgroundColor: type.colorHex,
                      borderColor: isSelected ? '#000' : 'rgba(0, 0, 0, 0.1)',
                      boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                    }}
                  />

                  {/* Label */}
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-600 mt-1 leading-tight">{type.subtitle}</div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-grove-green flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
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

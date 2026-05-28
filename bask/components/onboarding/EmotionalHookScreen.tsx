'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Mascot from '../ui/Mascot';

interface EmotionalHookScreenProps {
  onContinue: () => void;
}

export default function EmotionalHookScreen({ onContinue }: EmotionalHookScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  return (
    <div className="flex flex-col flex-1 h-full items-center justify-center px-6 relative overflow-hidden">
      {/* Atmospheric gradient background - soft warm */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

      {/* Mascot */}
      <div className="mb-8 z-10">
        <Mascot size={140} mood="happy" />
      </div>

      {/* Content */}
      <div className="w-full max-w-md z-10 text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Get your daily vitamin D—naturally
          </h1>
          <p className="text-base text-gray-700">
            Personalized sun exposure guidance for your wellness, safely
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          className="w-full py-4 px-8 rounded-full bg-black text-white text-[17px] font-semibold active:scale-[0.98] transition-all duration-200 shadow-lg"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          Start My Personalization
        </button>
      </div>
    </div>
  );
}

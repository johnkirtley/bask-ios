'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface EmotionalHookScreenProps {
  onContinue: () => void;
}

export default function EmotionalHookScreen({ onContinue }: EmotionalHookScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 pb-safe">
      {/* Animated sun container */}
      <div className="relative w-[300px] h-[300px] mb-12">
        {/* Main sun orb with pulsing glow */}
        <div className="sun-orb" />

        {/* Atmospheric glow overlay */}
        <div className="atmospheric-glow" />

        {/* Sun rays (8 rays at 45-degree intervals) */}
        <div className="sun-rays absolute inset-0 flex items-center justify-center">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
            <div
              key={rotation}
              className="sun-ray absolute"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
          ))}
        </div>

        {/* Light particles floating upward */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="light-particle"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 0.25}s`,
            }}
          />
        ))}
      </div>

      {/* Title text with glow */}
      <h1
        className="font-title text-4xl text-center text-white mb-16"
        style={{
          textShadow: '0 0 20px rgba(232, 169, 89, 0.5), 0 0 40px rgba(212, 165, 116, 0.3)',
        }}
      >
        Unlock the Power of the Sun.
      </h1>

      {/* CTA Button */}
      <button
        onClick={handleContinue}
        className="
          w-full max-w-sm px-8 py-4 rounded-full
          backdrop-blur-xl bg-golden-glow/20 border-2 border-golden-glow
          text-[17px] font-semibold text-white
          active:scale-[0.98] transition-all duration-200
          shadow-lg
        "
        style={{
          boxShadow: '0 0 20px rgba(212, 165, 116, 0.3), inset 0 0 20px rgba(212, 165, 116, 0.1)',
        }}
      >
        Start My Personalization
      </button>
    </div>
  );
}

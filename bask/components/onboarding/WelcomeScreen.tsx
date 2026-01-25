'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const handleGetStarted = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onGetStarted();
  };

  return (
    <div className="flex flex-col h-full px-6 pt-safe">
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-[28px] font-title text-umber text-center leading-tight">
          Welcome To Olly
        </h1>
        <p className="text-umber-muted text-center mt-3">
          Let&apos;s answer a few questions before we get started
        </p>
        <img
          src="/olly-welcome.png"
          alt="Olly"
          className="w-64 h-64 mt-8 object-contain"
        />
      </div>
      <div className="pb-safe py-4">
        <button
          onClick={handleGetStarted}
          className="w-full py-4 bg-olive text-oat rounded-full text-[17px] font-semibold active:scale-[0.98] transition-transform"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

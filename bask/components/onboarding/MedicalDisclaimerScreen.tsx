'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MedicalDisclaimerScreenProps {
  onAccept: () => void;
}

export default function MedicalDisclaimerScreen({ onAccept }: MedicalDisclaimerScreenProps) {
  const [canProceed, setCanProceed] = useState(false);

  // Enable button after 2 seconds to ensure user has time to read
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanProceed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    if (!canProceed) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
    onAccept();
  };

  const disclaimerPoints = [
    'This app is for informational and educational purposes only. It is not a medical device.',
    'Always consult your physician before starting or changing a supplement regimen.',
    'Vitamin D recommendations provided by this app are estimates based on general research and should not replace professional medical advice.',
    'Individual vitamin D needs vary based on age, health conditions, medications, and other factors only your healthcare provider can assess.',
  ];

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-safe">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-title text-[28px] leading-tight text-white mb-2">
          Important Health Information
        </h2>
        <p className="text-[15px] text-text-secondary">Please read carefully before continuing</p>
      </div>

      {/* Disclaimer Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            {/* Info Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-golden-glow/20 border border-golden-glow/40 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-golden-glow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-white">Medical Disclaimer</h3>
          </div>

          {/* Disclaimer Points */}
          <div className="space-y-5">
            {disclaimerPoints.map((point, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-golden-glow/20 border border-golden-glow/40 flex items-center justify-center mt-0.5">
                  <span className="text-[12px] font-semibold text-golden-glow">{index + 1}</span>
                </div>
                <p className="text-[15px] text-text-secondary leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accept button */}
      <div className="mt-6">
        <button
          onClick={handleAccept}
          disabled={!canProceed}
          className={`
            w-full py-4 rounded-full text-[17px] font-semibold
            transition-all duration-200
            ${
              canProceed
                ? 'bg-golden-glow text-dark-bg active:scale-[0.98]'
                : 'bg-golden-glow/30 text-white/50 cursor-not-allowed'
            }
          `}
        >
          {canProceed ? 'I Understand' : 'Please read...'}
        </button>
        {!canProceed && (
          <p className="text-center text-[13px] text-text-secondary mt-2">
            Button will be enabled in a moment
          </p>
        )}
      </div>
    </div>
  );
}

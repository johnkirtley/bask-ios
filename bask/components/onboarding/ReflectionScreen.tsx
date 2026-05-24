'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ReflectionScreenProps {
  label?: string;
  headline?: string;
  body: string;
  onContinue: () => void;
}

export default function ReflectionScreen({
  label,
  headline,
  body,
  onContinue,
}: ReflectionScreenProps) {
  const handleContinue = async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    onContinue();
  };

  return (
    <div className="flex flex-col flex-1 min-h-full px-6 pt-6 pb-8 relative overflow-y-auto">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 justify-center">
        <div className="max-w-sm mx-auto w-full space-y-4 text-center">
          {label && (
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          )}
          {headline && (
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{headline}</h2>
          )}
          <p className="text-base text-gray-700 leading-relaxed">{body}</p>
        </div>

        <div className="mt-auto pt-10 max-w-sm mx-auto w-full">
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

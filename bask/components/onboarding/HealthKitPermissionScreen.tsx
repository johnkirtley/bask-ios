'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PermissionResult } from '../../types';

interface HealthKitPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

export default function HealthKitPermissionScreen({
  onPermissionResult,
}: HealthKitPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableHealthKit = async () => {
    setIsRequesting(true);
    await Haptics.impact({ style: ImpactStyle.Medium });

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      try {
        const { BaskHealth } = await import('../../lib/plugins/baskHealth').catch(() => ({
          BaskHealth: null,
        }));

        if (BaskHealth && typeof BaskHealth.requestAuthorization === 'function') {
          const result = await BaskHealth.requestAuthorization();
          setIsRequesting(false);
          if (result.authorized) {
            onPermissionResult('granted');
            return;
          }
          onPermissionResult('denied');
          return;
        }
      } catch (error) {
        console.warn('BaskHealth plugin not available:', error);
      }
    }

    setIsRequesting(false);
    onPermissionResult('denied');
  };

  const handleSkip = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onPermissionResult('skipped');
  };

  return (
    <div className="flex flex-col flex-1 h-full px-6 pt-6 relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 35%, #BAE6FD 70%, #7DD3FC 100%)',
        }}
      />

      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        style={{ mixBlendMode: 'multiply' }}
      >
        <defs>
          <pattern id="health-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M100,50 C100,42 95,38 90,38 C85,38 82,42 80,45 C78,42 75,38 70,38 C65,38 60,42 60,50 C60,58 70,68 80,75 C90,68 100,58 100,50 Z"
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#health-pattern)" />
      </svg>

      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
            Connect Apple Health?
          </h2>
          <p className="text-base text-gray-700 mb-4">
            We&apos;ll use your Time in Daylight from Apple Watch to automatically estimate vitamin D from outdoor time you didn&apos;t manually track.
          </p>
          <div className="bg-white/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-grove-green-dark mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900 text-sm">We read:</p>
                <p className="text-gray-700 text-sm">Time in Daylight from Apple Watch (iOS 17+)</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900 text-sm">We write:</p>
                <p className="text-gray-700 text-sm">Vitamin D from your bask sessions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnableHealthKit}
            disabled={isRequesting}
            className={`
              w-full py-4 rounded-full text-[17px] font-semibold
              transition-all duration-200
              ${
                isRequesting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-black text-white active:scale-[0.98] shadow-lg'
              }
            `}
          >
            {isRequesting ? 'Requesting...' : 'Connect Apple Health'}
          </button>

          <button
            onClick={handleSkip}
            disabled={isRequesting}
            className="w-full py-4 rounded-full text-[17px] font-semibold text-gray-700 active:scale-[0.98] transition-all duration-200"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

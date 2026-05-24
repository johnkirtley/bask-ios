'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PermissionResult } from '../../types';

interface LocationPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

export default function LocationPermissionScreen({
  onPermissionResult,
}: LocationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableLocation = async () => {
    setIsRequesting(true);
    await Haptics.impact({ style: ImpactStyle.Medium });

    if (Capacitor.isNativePlatform()) {
      try {
        const { BaskWeather } = await import('../../lib/plugins/baskWeather').catch(() => ({
          BaskWeather: null,
        }));

        if (BaskWeather && typeof BaskWeather.requestLocationPermission === 'function') {
          const result = await BaskWeather.requestLocationPermission();
          setIsRequesting(false);
          if (result.status === 'granted') {
            onPermissionResult('granted');
            return;
          }
          onPermissionResult('denied');
          return;
        }
      } catch (error) {
        console.warn('BaskWeather plugin not available yet:', error);
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
      {/* Atmospheric gradient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

      {/* Topographic contour lines overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        style={{ mixBlendMode: 'multiply' }}
      >
        <defs>
          <pattern id="topo" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
            <ellipse cx="200" cy="200" rx="40" ry="35" fill="none" stroke="#666" strokeWidth="1.5" />
            <ellipse cx="200" cy="200" rx="80" ry="70" fill="none" stroke="#666" strokeWidth="1.5" />
            <ellipse cx="200" cy="200" rx="120" ry="105" fill="none" stroke="#666" strokeWidth="1.5" />
            <ellipse cx="200" cy="200" rx="160" ry="140" fill="none" stroke="#666" strokeWidth="1.5" />
            <ellipse cx="200" cy="200" rx="200" ry="175" fill="none" stroke="#666" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>

      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
            Now, can we get your location?
          </h2>
          <p className="text-base text-gray-700">
            We use it to give accurate real-time insights into sunlight availability in your location, including UV index, optimal times for sun exposure, and cloud coverage predictions.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnableLocation}
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
            {isRequesting ? 'Requesting...' : 'Next'}
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

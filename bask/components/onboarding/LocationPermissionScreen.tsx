'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface LocationPermissionScreenProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

export default function LocationPermissionScreen({
  onPermissionGranted,
  onSkip,
}: LocationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableLocation = async () => {
    setIsRequesting(true);
    await Haptics.impact({ style: ImpactStyle.Medium });

    // Only attempt native location request on native platform
    if (Capacitor.isNativePlatform()) {
      try {
        // Try to import BaskWeather plugin if it exists
        const { BaskWeather } = await import('../../lib/plugins/baskWeather').catch(() => ({
          BaskWeather: null,
        }));

        if (BaskWeather && typeof BaskWeather.requestLocationPermission === 'function') {
          // Native plugin is available, request permission
          const result = await BaskWeather.requestLocationPermission();
          if (result.status === 'granted') {
            onPermissionGranted();
            return;
          }
        }
      } catch (error) {
        console.warn('BaskWeather plugin not available yet:', error);
      }
    }

    // On web or if plugin not available, just proceed
    // (Location will be handled by browser's geolocation API later)
    setIsRequesting(false);
    onPermissionGranted();
  };

  const handleSkip = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onSkip();
  };

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-safe">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-title text-[28px] leading-tight text-white mb-2">
          Enable Location for UV Data
        </h2>
        <p className="text-[15px] text-text-secondary">
          Get personalized sun exposure recommendations based on your local UV index
        </p>
      </div>

      {/* Privacy Nutrition Label Style Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Main Info Card */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            {/* Location Icon */}
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-white">Why We Need Location</h3>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-golden-glow/20 flex items-center justify-center mt-0.5">
                <svg
                  className="w-4 h-4 text-golden-glow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-medium text-white">Local UV Index</p>
                <p className="text-[13px] text-text-secondary mt-1">
                  We check your area&apos;s UV levels to calculate optimal sun exposure times
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-golden-glow/20 flex items-center justify-center mt-0.5">
                <svg
                  className="w-4 h-4 text-golden-glow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-medium text-white">Background Monitoring</p>
                <p className="text-[13px] text-text-secondary mt-1">
                  Receive smart alerts when UV reaches optimal levels for your skin type
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-golden-glow/20 flex items-center justify-center mt-0.5">
                <svg
                  className="w-4 h-4 text-golden-glow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-medium text-white">Weather-Adjusted Plans</p>
                <p className="text-[13px] text-text-secondary mt-1">
                  Get accurate vitamin D calculations based on cloud cover and seasonal changes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="backdrop-blur-xl bg-golden-glow/5 border border-golden-glow/30 rounded-xl p-4">
          <div className="flex gap-3">
            <svg
              className="flex-shrink-0 w-5 h-5 text-golden-glow mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <p className="text-[13px] font-medium text-white mb-1">Your Privacy</p>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Location data is used only to fetch local UV index. It&apos;s never sold, shared, or
                stored on our servers. You can revoke access anytime in Settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleEnableLocation}
          disabled={isRequesting}
          className={`
            w-full py-4 rounded-full text-[17px] font-semibold
            transition-all duration-200
            ${
              isRequesting
                ? 'bg-golden-glow/50 text-dark-bg cursor-not-allowed'
                : 'bg-golden-glow text-dark-bg active:scale-[0.98]'
            }
          `}
        >
          {isRequesting ? 'Requesting...' : 'Enable Location'}
        </button>

        <button
          onClick={handleSkip}
          disabled={isRequesting}
          className="w-full py-4 rounded-full text-[17px] font-medium text-text-secondary active:scale-[0.98] transition-all duration-200"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
}

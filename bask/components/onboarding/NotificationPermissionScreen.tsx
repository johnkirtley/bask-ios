'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { notificationService } from '../../lib/services/notificationService';
import { PermissionResult } from '../../types';

interface NotificationPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

export default function NotificationPermissionScreen({
  onPermissionResult,
}: NotificationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    await Haptics.impact({ style: ImpactStyle.Medium });

    if (Capacitor.isNativePlatform()) {
      try {
        const granted = await notificationService.requestPermission();

        if (granted) {
          await notificationService.saveSettings({
            enabled: true,
            leadTimeMinutes: 20,
          });
          setIsRequesting(false);
          onPermissionResult('granted');
          return;
        }
      } catch (error) {
        console.warn('Notification permission request failed:', error);
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
          background: 'linear-gradient(180deg, #FFFCF8 0%, #FFF3E8 35%, #FFE8D6 70%, #FFDCC8 100%)',
        }}
      />

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
            Never miss your vitamin D timing
          </h2>
          <p className="text-base text-gray-700">
            Get alerts for optimal windows, when D synthesis starts, and before it ends for the day. You can turn these on anytime in Settings.
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnableNotifications}
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
            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
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

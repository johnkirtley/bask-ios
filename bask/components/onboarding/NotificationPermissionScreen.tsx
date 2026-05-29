'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { notificationService } from '../../lib/services/notificationService';
import { PermissionResult } from '../../types';
import {
  WarmBody,
  WarmCTA,
  WarmGhost,
  WarmHeadline,
  WarmPermissionGlyph,
  WarmSub,
} from './warm/atoms';
import { BellIcon } from './warm/icons';

interface NotificationPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

export default function NotificationPermissionScreen({
  onPermissionResult,
}: NotificationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const granted = await notificationService.requestPermission();
        if (granted) {
          await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
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
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    onPermissionResult('skipped');
  };

  return (
    <WarmBody
      center
      footer={
        <>
          <WarmCTA onClick={handleEnableNotifications} disabled={isRequesting}>
            {isRequesting ? 'Requesting…' : 'Enable notifications'}
          </WarmCTA>
          <WarmGhost onClick={handleSkip} disabled={isRequesting}>
            Not now
          </WarmGhost>
        </>
      }
    >
      <div
        className="warm-step-in"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
      >
        <WarmPermissionGlyph>
          <BellIcon size={36} />
        </WarmPermissionGlyph>
        <div style={{ marginTop: 20 }}>
          <WarmHeadline size={27}>Never miss your D-window</WarmHeadline>
          <WarmSub>
            We&apos;ll alert you when vitamin D synthesis starts and before it ends for the day.
            Adjust anytime in Settings.
          </WarmSub>
        </div>
      </div>
    </WarmBody>
  );
}

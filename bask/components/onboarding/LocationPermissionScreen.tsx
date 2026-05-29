'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PermissionResult } from '../../types';
import {
  WarmBody,
  WarmCTA,
  WarmCite,
  WarmGhost,
  WarmHeadline,
  WarmPermissionGlyph,
  WarmSub,
} from './warm/atoms';
import { LocationIcon } from './warm/icons';

interface LocationPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

export default function LocationPermissionScreen({
  onPermissionResult,
}: LocationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableLocation = async () => {
    setIsRequesting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { BaskWeather } = await import('../../lib/plugins/baskWeather').catch(() => ({
          BaskWeather: null,
        }));

        if (BaskWeather && typeof BaskWeather.requestLocationPermission === 'function') {
          const result = await BaskWeather.requestLocationPermission();
          setIsRequesting(false);
          onPermissionResult(result.status === 'granted' ? 'granted' : 'denied');
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
          <WarmCTA onClick={handleEnableLocation} disabled={isRequesting}>
            {isRequesting ? 'Requesting…' : 'Share location'}
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
          <LocationIcon size={36} />
        </WarmPermissionGlyph>
        <div style={{ marginTop: 20 }}>
          <WarmHeadline size={27}>Can we use your location?</WarmHeadline>
          <WarmSub>
            We use it for real-time sunlight insights where you are: UV index, best times to
            bask, and cloud cover.
          </WarmSub>
        </div>
        <div style={{ marginTop: 22, width: '100%' }}>
          <WarmCite id="winter" />
        </div>
      </div>
    </WarmBody>
  );
}

'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PermissionResult } from '../../types';
import {
  WARM,
  WarmBody,
  WarmCTA,
  WarmGhost,
  WarmHeadline,
  WarmPermissionGlyph,
  WarmSub,
} from './warm/atoms';
import { HeartIcon } from './warm/icons';

interface HealthKitPermissionScreenProps {
  onPermissionResult: (result: PermissionResult) => void;
}

function ReadWriteRow({ tag, text }: { tag: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: WARM.sunDeep,
          marginTop: 2,
          minWidth: 44,
        }}
      >
        {tag}
      </span>
      <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: WARM.ink + 'cc' }}>
        {text}
      </span>
    </div>
  );
}

export default function HealthKitPermissionScreen({
  onPermissionResult,
}: HealthKitPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableHealthKit = async () => {
    setIsRequesting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      try {
        const { BaskHealth } = await import('../../lib/plugins/baskHealth').catch(() => ({
          BaskHealth: null,
        }));

        if (BaskHealth && typeof BaskHealth.requestAuthorization === 'function') {
          const result = await BaskHealth.requestAuthorization();
          setIsRequesting(false);
          onPermissionResult(result.authorized ? 'granted' : 'denied');
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
          <WarmCTA onClick={handleEnableHealthKit} disabled={isRequesting}>
            {isRequesting ? 'Requesting…' : 'Connect Apple Health'}
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
          <HeartIcon color="#FF4D4D" size={34} />
        </WarmPermissionGlyph>
        <div style={{ marginTop: 20 }}>
          <WarmHeadline size={27}>Connect Apple Health?</WarmHeadline>
          <WarmSub>
            We use your Time in Daylight from Apple Watch to estimate vitamin D from outdoor time
            you didn&apos;t manually track.
          </WarmSub>
        </div>

        <div
          style={{
            marginTop: 22,
            width: '100%',
            background: WARM.card,
            borderRadius: 20,
            padding: '18px 18px',
            boxShadow: '0 6px 20px rgba(40,30,10,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            textAlign: 'left',
          }}
        >
          <ReadWriteRow tag="We read" text="Time in Daylight from Apple Watch (iOS 17+)" />
          <ReadWriteRow tag="We write" text="Vitamin D from your bask sessions" />
        </div>
      </div>
    </WarmBody>
  );
}

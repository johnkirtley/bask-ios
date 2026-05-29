'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { WARM, WarmBody, WarmCTA, WarmHeadline, WarmInfoCard, WarmSub } from './warm/atoms';
import { InfoIcon } from './warm/icons';

interface MedicalDisclaimerScreenProps {
  onAccept: () => void;
}

const disclaimerPoints = [
  'This app is for informational and educational purposes only. It is not a medical device.',
  'Always consult your physician before starting or changing a supplement regimen.',
  'Vitamin D recommendations here are estimates based on general research and should not replace professional medical advice.',
  'Individual vitamin D needs vary with age, health conditions, and medications only your provider can assess.',
];

export default function MedicalDisclaimerScreen({ onAccept }: MedicalDisclaimerScreenProps) {
  const [canProceed, setCanProceed] = useState(false);

  // Enable button after 2 seconds to ensure user has time to read
  useEffect(() => {
    const timer = setTimeout(() => setCanProceed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    if (!canProceed) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onAccept();
  };

  return (
    <WarmBody
      footer={
        <>
          <WarmCTA onClick={handleAccept} disabled={!canProceed}>
            {canProceed ? 'I understand' : 'Please read…'}
          </WarmCTA>
          {!canProceed && (
            <p
              style={{
                margin: '10px 0 0',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 13,
                color: WARM.mute,
              }}
            >
              Button enables in a moment.
            </p>
          )}
        </>
      }
    >
      <div className="warm-step-in">
        <WarmHeadline size={27}>Important health information</WarmHeadline>
        <WarmSub>Please read carefully before continuing.</WarmSub>

        <div style={{ marginTop: 22 }}>
          <WarmInfoCard
            title="Medical disclaimer"
            icon={<InfoIcon size={20} />}
            items={disclaimerPoints}
          />
        </div>
      </div>
    </WarmBody>
  );
}

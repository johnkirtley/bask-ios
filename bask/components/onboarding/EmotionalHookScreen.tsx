'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Mascot from '../ui/Mascot';
import {
  WARM,
  WarmBody,
  WarmCTA,
  WarmCite,
  WarmHeadline,
  WarmSub,
} from './warm/atoms';

interface EmotionalHookScreenProps {
  onContinue: () => void;
}

export default function EmotionalHookScreen({ onContinue }: EmotionalHookScreenProps) {
  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  return (
    <WarmBody
      center
      footer={<WarmCTA onClick={handleContinue}>Start my personalization</WarmCTA>}
    >
      <div className="warm-step-in" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Mascot size={140} mood="happy" floating />
        </div>

        <WarmHeadline>
          Get your daily vitamin D,{' '}
          <span style={{ color: WARM.sunDeep }}>naturally</span>
        </WarmHeadline>
        <WarmSub>Personalized sun guidance for your wellness, safely.</WarmSub>

        <div style={{ marginTop: 22 }}>
          <WarmCite id="genes" />
        </div>
      </div>
    </WarmBody>
  );
}

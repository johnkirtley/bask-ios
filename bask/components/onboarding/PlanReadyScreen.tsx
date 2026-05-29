'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Mascot from '../ui/Mascot';
import {
  WarmBody,
  WarmCTA,
  WarmCite,
  WarmHeadline,
  WarmSub,
} from './warm/atoms';

interface PlanReadyScreenProps {
  onComplete: () => void;
}

export default function PlanReadyScreen({ onComplete }: PlanReadyScreenProps) {
  const handleStart = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onComplete();
  };

  return (
    <WarmBody
      center
      footer={<WarmCTA onClick={handleStart}>Start basking</WarmCTA>}>
      <div
        className='warm-step-in'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
        <Mascot size={132} mood='excited' floating />
        <div style={{ marginTop: 18 }}>
          <WarmHeadline>Your sun plan is ready ☀</WarmHeadline>
          <WarmSub>
            A daily window tuned to your skin, location, and routine.
          </WarmSub>
        </div>

        <div
          style={{
            marginTop: 24,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
          <WarmCite id='aging' />
          <WarmCite id='vital' />
        </div>
      </div>
    </WarmBody>
  );
}

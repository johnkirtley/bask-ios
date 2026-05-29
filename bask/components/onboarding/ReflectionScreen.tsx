'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Mascot from '../ui/Mascot';
import {
  WARM,
  WarmBody,
  WarmCTA,
  WarmEyebrow,
  WarmHeadline,
  WarmSpeechBubble,
} from './warm/atoms';

type ReflectionVariant = 'bubble' | 'insight' | 'spf';

interface ReflectionScreenProps {
  label?: string;
  headline?: string;
  body: string;
  onContinue: () => void;
  variant?: ReflectionVariant;
}

export default function ReflectionScreen({
  label,
  headline,
  body,
  onContinue,
  variant = 'insight',
}: ReflectionScreenProps) {
  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  const footer = <WarmCTA onClick={handleContinue}>Continue</WarmCTA>;

  const paragraphs = body.split('\n\n').map((p) => p.trim()).filter(Boolean);

  if (variant === 'bubble') {
    return (
      <WarmBody center footer={footer}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <WarmSpeechBubble>
            <div style={{ marginBottom: 8 }}>
              <WarmEyebrow>{label ?? 'Did you know?'}</WarmEyebrow>
            </div>
            {paragraphs.map((para, i) => (
              <p
                key={i}
                style={{
                  margin: i ? '10px 0 0' : 0,
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.45,
                  color: WARM.ink,
                }}
              >
                {para}
              </p>
            ))}
          </WarmSpeechBubble>
          <div style={{ marginTop: 6 }}>
            <Mascot size={104} mood="happy" floating />
          </div>
        </div>
      </WarmBody>
    );
  }

  // 'insight' and 'spf' share a centered mascot + text layout.
  const mascotSize = variant === 'spf' ? 92 : 116;
  const mood = variant === 'spf' ? 'happy' : 'excited';

  return (
    <WarmBody center footer={footer}>
      <div
        className="warm-step-in"
        style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <Mascot size={mascotSize} mood={mood} floating />
        <div style={{ marginTop: 18 }}>
          {label && <WarmEyebrow>{label}</WarmEyebrow>}
          {headline && (
            <div style={{ marginTop: label ? 8 : 0 }}>
              <WarmHeadline size={26}>{headline}</WarmHeadline>
            </div>
          )}
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                margin: '12px auto 0',
                fontWeight: 700,
                fontSize: 15.5,
                lineHeight: 1.5,
                color: WARM.mute,
                maxWidth: 340,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </WarmBody>
  );
}

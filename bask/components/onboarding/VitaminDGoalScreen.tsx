'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  DEFAULT_DAILY_GOAL_IU,
  NIH_BASELINE_DAILY_GOAL_IU,
} from '../../lib/constants';
import { WARM, WarmBody, WarmCTA, WarmHeadline, WarmSub } from './warm/atoms';
import { SparkleIcon } from './warm/icons';

const GOAL_OPTIONS = [600, 1000, 2000, 4000, 5000] as const;

interface VitaminDGoalScreenProps {
  selectedGoal: number;
  onSelect: (goal: number) => void;
  onContinue: () => void;
}

export default function VitaminDGoalScreen({
  selectedGoal,
  onSelect,
  onContinue,
}: VitaminDGoalScreenProps) {
  const handleSelect = async (goal: number) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    onSelect(goal);
  };

  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  return (
    <WarmBody footer={<WarmCTA onClick={handleContinue}>Continue</WarmCTA>}>
      <div className='warm-step-in'>
        <WarmHeadline size={27}>Set your daily Vitamin D goal</WarmHeadline>
        <WarmSub>
          Choose the total IU target you want Bask to track each day. (Can
          change later.)
        </WarmSub>

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}>
          {GOAL_OPTIONS.map((goal) => {
            const selected = selectedGoal === goal;
            return (
              <button
                key={goal}
                type='button'
                className='bask-button'
                onClick={() => void handleSelect(goal)}
                aria-pressed={selected}
                style={{
                  appearance: 'none',
                  border: selected
                    ? `2px solid ${WARM.sunDeep}`
                    : '1px solid rgba(42,36,25,0.08)',
                  borderRadius: 18,
                  background: selected ? WARM.sun + '29' : WARM.card,
                  boxShadow: selected
                    ? `0 8px 24px ${WARM.sunDeep}2b`
                    : '0 4px 16px rgba(40,30,10,0.06)',
                  minHeight: 82,
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  color: WARM.ink,
                }}>
                <span
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    fontWeight: 900,
                    letterSpacing: 0,
                  }}>
                  {goal.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    color: WARM.mute,
                  }}>
                  IU
                </span>
                {goal === DEFAULT_DAILY_GOAL_IU && (
                  <span
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      fontWeight: 800,
                      color: WARM.sunDeep,
                    }}>
                    Bask default
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            background: 'rgba(255,255,255,0.78)',
            border: '1px solid rgba(42,36,25,0.06)',
            borderRadius: 18,
            padding: '14px 16px',
            boxShadow: '0 4px 16px rgba(40,30,10,0.05)',
          }}>
          <span
            aria-hidden='true'
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: WARM.sun + '29',
              color: WARM.sunDeep,
            }}>
            <SparkleIcon color={WARM.sunDeep} size={16} />
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.45,
              fontWeight: 700,
              color: WARM.mute,
            }}>
            {NIH_BASELINE_DAILY_GOAL_IU.toLocaleString()} IU is the baseline NIH
            recommendation for most adults, while some people choose higher
            targets. Ask your healthcare provider what daily amount is right for
            you.
          </p>
        </div>
      </div>
    </WarmBody>
  );
}

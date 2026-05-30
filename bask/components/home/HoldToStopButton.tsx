'use client';

import { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

interface HoldToStopButtonProps {
  onHoldComplete: () => void;
  label: string;
  holdLabel?: string;
  holdDurationMs?: number;
  className?: string;
}

/**
 * Press-and-hold Stop control. Prevents accidental pocket taps from ending a
 * session: the user must hold for ~holdDurationMs before onHoldComplete fires.
 * A momentary press releases before the threshold and does nothing.
 */
export default function HoldToStopButton({
  onHoldComplete,
  label,
  holdLabel = 'Hold to stop…',
  holdDurationMs = 1500,
  className = '',
}: HoldToStopButtonProps) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  // Clear any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cancelHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!completedRef.current) {
      setHolding(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Keep receiving pointerup even if the finger drifts off the button
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    completedRef.current = false;
    setHolding(true);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

    timerRef.current = setTimeout(() => {
      completedRef.current = true;
      timerRef.current = null;
      setHolding(false);
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      onHoldComplete();
    }, holdDurationMs);
  };

  return (
    <button
      type='button'
      onPointerDown={handlePointerDown}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      style={{ touchAction: 'none' }}
      className={`relative overflow-hidden py-4 bg-white rounded-full text-lg font-black text-[#2A2419] shadow-[0_4px_14px_rgba(40,30,10,0.07)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${className}`}>
      {/* Progress fill that sweeps left→right over the hold duration */}
      <span
        aria-hidden
        className='absolute inset-y-0 left-0 w-full bg-ember-alert/15 origin-left pointer-events-none'
        style={{
          transform: holding ? 'scaleX(1)' : 'scaleX(0)',
          transition: holding
            ? `transform ${holdDurationMs}ms linear`
            : 'transform 150ms ease-out',
        }}
      />
      <span className='relative z-10 flex items-center justify-center gap-2'>
        <span className='w-3 h-3 rounded-sm bg-ember-alert' />
        {holding ? holdLabel : label}
      </span>
    </button>
  );
}

'use client';

import ProBadge from '../ui/ProBadge';

interface LockedSunburnValueProps {
  label: string;
  onUnlock?: () => void;
  className?: string;
}

export default function LockedSunburnValue({
  label,
  onUnlock,
  className = '',
}: LockedSunburnValueProps) {
  return (
    <button
      type='button'
      onClick={onUnlock}
      className={`relative isolate min-h-[56px] w-full overflow-hidden rounded-xl text-left active:scale-[0.98] transition-transform ${className}`}
      aria-label='Unlock sunburn risk timing with Pro'>
      <div
        className='rounded-xl border border-black/5 bg-vitality-mint/[0.12] p-2.5'
        aria-hidden='true'>
        <div className='animate-pulse space-y-2'>
          <div className='h-6 w-24 rounded bg-black/10' />
          <div className='h-3 w-36 rounded bg-black/[0.06]' />
        </div>
      </div>

      <div className='absolute inset-0 z-10 bg-white/90 backdrop-blur-xl pointer-events-none' />

      <div className='absolute inset-0 z-20 flex flex-col items-start justify-center gap-1.5 px-3 text-left pointer-events-none'>
        <ProBadge variant='compact' interactive={false} />
        <p className='text-[11px] font-semibold leading-tight text-text-primary'>
          {label}
        </p>
      </div>
    </button>
  );
}

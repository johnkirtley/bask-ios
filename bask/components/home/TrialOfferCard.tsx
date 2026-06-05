'use client';

interface TrialOfferCardProps {
  onPress: () => void;
}

const GiftIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-7 w-7'
    aria-hidden='true'>
    <path d='M20 12v10H4V12' />
    <path d='M2 7h20v5H2z' />
    <path d='M12 22V7' />
    <path d='M12 7H7.5A2.5 2.5 0 1 1 10 4.5c0 1.5 2 2.5 2 2.5z' />
    <path d='M12 7h4.5A2.5 2.5 0 1 0 14 4.5c0 1.5-2 2.5-2 2.5z' />
  </svg>
);

const ArrowIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.4'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-5 w-5'
    aria-hidden='true'>
    <path d='M5 12h14' />
    <path d='m13 6 6 6-6 6' />
  </svg>
);

export default function TrialOfferCard({ onPress }: TrialOfferCardProps) {
  return (
    <button
      type='button'
      onClick={onPress}
      className='w-full rounded-card border border-white/50 bg-gradient-to-br from-[#FFC93C] via-[#F9AD32] to-[#FF8A3D] px-4 py-5 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_14px_32px_rgba(244,165,54,0.32)] active:scale-[0.99] transition-all'
      aria-label='Open Bask Pro free trial offer'>
      <div className='flex items-center gap-4 text-left'>
        <span className='flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl border border-white/55 bg-white/45 text-[#8A4A08] shadow-[0_1px_0_rgba(255,255,255,0.65)_inset]'>
          <GiftIcon />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-base font-black tracking-tight text-[#2A2419]'>
            Bask Pro Trial Offer
          </span>
          <span className='mt-1 block text-xs font-bold leading-snug text-[#2A2419]/75'>
            Unlock notifications, extended D-Windows, and more
          </span>
        </span>
        <span className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2A2419]/12 text-[#2A2419] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]'>
          <ArrowIcon />
        </span>
      </div>
    </button>
  );
}

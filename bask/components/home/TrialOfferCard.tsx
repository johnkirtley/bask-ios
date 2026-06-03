'use client';

interface TrialOfferCardProps {
  onPress: () => void;
}

const GiftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7"
    aria-hidden="true"
  >
    <path d="M20 12v10H4V12" />
    <path d="M2 7h20v5H2z" />
    <path d="M12 22V7" />
    <path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5c0 1.5 2 2.5 2 2.5z" />
    <path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5c0 1.5-2 2.5-2 2.5z" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export default function TrialOfferCard({ onPress }: TrialOfferCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full rounded-card bg-white px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_6px_24px_rgba(40,30,10,0.06)] active:scale-[0.99] transition-all"
      aria-label="Open Bask Pro free trial offer"
    >
      <div className="flex items-center gap-4 text-left">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-solar-flare/20 to-solar-warm/20 text-solar-flare">
          <GiftIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold tracking-tight text-text-primary">
            Free trial offer
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-text-secondary">
            Try Bask Pro for smarter D-Windows and sunburn timing
          </span>
        </span>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-text-secondary">
          <ArrowIcon />
        </span>
      </div>
    </button>
  );
}

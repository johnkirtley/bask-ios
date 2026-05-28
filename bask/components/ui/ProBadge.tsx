'use client';

interface ProBadgeProps {
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

/**
 * PRO badge for locked premium features
 * Tapping triggers paywall presentation
 */
export default function ProBadge({ onClick, variant = 'default' }: ProBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${
        variant === 'compact' ? 'px-2 py-1' : 'px-2.5 py-1'
      } rounded-full bg-gradient-to-r from-solar-flare to-solar-warm text-white font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-[0.98] transition-transform duration-150`}
      aria-label="Unlock with Pro">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3'}>
        <path
          fillRule="evenodd"
          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
          clipRule="evenodd"
        />
      </svg>
      <span>PRO</span>
    </button>
  );
}

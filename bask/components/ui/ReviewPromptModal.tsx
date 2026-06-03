'use client';

interface ReviewPromptModalProps {
  isOpen: boolean;
  onPositive: () => void;
  onNegative: () => void;
}

const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-9 w-9"
    aria-hidden="true"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const FrownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-9 w-9"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8.5 16c1.9-2 5.1-2 7 0" />
  </svg>
);

export default function ReviewPromptModal({
  isOpen,
  onPositive,
  onNegative,
}: ReviewPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-prompt-title"
        aria-describedby="review-prompt-body"
        className="w-full max-w-[430px] rounded-[28px] border border-white/12 bg-[#121212]/90 px-6 py-7 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur-2xl"
      >
        <h2
          id="review-prompt-title"
          className="text-[34px] font-black leading-[1.05] tracking-normal text-white"
        >
          Happy with Bask?
        </h2>
        <p
          id="review-prompt-body"
          className="mt-5 text-[25px] font-semibold leading-snug tracking-normal text-white/55"
        >
          We'd love your feedback. It helps our small team make the app better
          every day.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onPositive}
            className="flex h-[86px] items-center justify-center rounded-[26px] bg-white/12 text-[#ff4d45] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] active:scale-[0.98] transition-transform"
            aria-label="Yes, I am happy with Bask"
          >
            <HeartIcon />
          </button>
          <button
            type="button"
            onClick={onNegative}
            className="flex h-[86px] items-center justify-center rounded-[26px] bg-white/12 text-[#f4c245] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] active:scale-[0.98] transition-transform"
            aria-label="Not really"
          >
            <FrownIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

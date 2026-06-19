'use client';

import { WhatsNewEntry } from '../../lib/whatsNewContent';

interface WhatsNewSheetProps {
  isOpen: boolean;
  entry: WhatsNewEntry | null;
  onClose: () => void;
}

export default function WhatsNewSheet({
  isOpen,
  entry,
  onClose,
}: WhatsNewSheetProps) {
  if (!isOpen || !entry) return null;

  return (
    <div
      className='fixed inset-0 z-[10000] flex flex-col bg-light-bg'
      role='dialog'
      aria-modal='true'
      aria-labelledby='whats-new-title'>
      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto px-7 pt-safe'>
        <div className='warm-step-in mx-auto w-full max-w-[480px] pt-16 pb-8'>
          <p className='text-sm font-bold uppercase tracking-[0.1em] text-solar-warm'>
            Just updated
          </p>
          <h1
            id='whats-new-title'
            className='mt-2 text-[34px] font-black leading-[1.08] text-text-primary'>
            {entry.headline ?? "What's New"}
          </h1>

          <ul className='mt-10 space-y-7'>
            {entry.items.map((item, index) => (
              <li key={index} className='flex items-start gap-4'>
                <span
                  className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-solar-flare/15 text-2xl'
                  aria-hidden='true'>
                  {item.icon}
                </span>
                <div className='pt-0.5'>
                  <h2 className='text-[17px] font-bold text-text-primary'>
                    {item.title}
                  </h2>
                  <p className='mt-1 text-[15px] leading-snug text-text-secondary'>
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pinned action */}
      <div className='px-7 pb-safe'>
        <div className='mx-auto w-full max-w-[480px] pb-6 pt-3'>
          <button
            type='button'
            onClick={onClose}
            className='flex h-[56px] w-full items-center justify-center rounded-full bg-gradient-to-r from-solar-flare to-solar-warm text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(244,165,54,0.35)] transition-transform active:scale-[0.98]'>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

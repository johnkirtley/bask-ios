'use client';

interface ReviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendFeedback: () => void;
}

const CloseIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.4'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-7 w-7'
    aria-hidden='true'>
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </svg>
);

const MessageIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-7 w-7'
    aria-hidden='true'>
    <path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' />
  </svg>
);

export default function ReviewFeedbackModal({
  isOpen,
  onClose,
  onSendFeedback,
}: ReviewFeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]'
      role='presentation'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='review-feedback-title'
        aria-describedby='review-feedback-body'
        className='w-full max-w-[430px] rounded-[28px] border border-white/12 bg-[#121212]/90 px-6 py-7 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur-2xl'>
        <h2
          id='review-feedback-title'
          className='text-[24px] font-black leading-[1.05] tracking-normal text-white'>
          Want to tell us what happened?
        </h2>
        <p
          id='review-feedback-body'
          className='mt-5 text-[19px] font-semibold leading-snug tracking-normal text-white/55'>
          You can send feedback, or keep going with your plan.
        </p>

        <div className='mt-8 grid grid-cols-2 gap-4'>
          <button
            type='button'
            onClick={onClose}
            className='flex h-[86px] items-center justify-center gap-2 rounded-[26px] bg-white/12 px-3 text-white/70 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] active:scale-[0.98] transition-transform'
            aria-label='No thanks'>
            <CloseIcon />
            <span className='text-sm font-extrabold'>No thanks</span>
          </button>
          <button
            type='button'
            onClick={onSendFeedback}
            className='flex h-[86px] items-center justify-center gap-2 rounded-[26px] bg-white/12 px-3 text-[#f4c245] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] active:scale-[0.98] transition-transform'
            aria-label='Send feedback'>
            <MessageIcon />
            <span className='text-sm font-extrabold'>Send feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
}

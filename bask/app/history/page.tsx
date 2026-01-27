'use client';

import AtmosphericBackground from '../../components/home/AtmosphericBackground';

export default function History() {
  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-3xl font-semibold text-white'>History</h1>
        </div>

        {/* Main content */}
        <div className='p-6'>
          <div className='backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20'>
            <div className='text-center py-12'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-16 h-16 mx-auto text-golden-glow mb-4'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5'
                />
              </svg>

              <h2 className='text-xl font-semibold text-white mb-3'>
                Coming Soon
              </h2>
              <p className='text-text-secondary max-w-sm mx-auto'>
                Track your daily sun exposure history, view your vitamin D trends,
                and see your basking streaks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AtmosphericBackground>
  );
}

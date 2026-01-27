'use client';

import AtmosphericBackground from '../../components/home/AtmosphericBackground';

export default function Insights() {
  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-3xl font-semibold text-white'>Insights</h1>
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
                  d='M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6'
                />
              </svg>

              <h2 className='text-xl font-semibold text-white mb-3'>
                Coming Soon
              </h2>
              <p className='text-text-secondary max-w-sm mx-auto'>
                Learn about vitamin D synthesis, K2 synergy, magnesium balance,
                and optimal sun exposure for your skin type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AtmosphericBackground>
  );
}

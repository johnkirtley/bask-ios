'use client';

import { useSubscription } from '../hooks/useSubscription';
import SettingsButton from '../components/navigation/SettingsButton';

export default function Home() {
  const { isPremium, presentPaywall } = useSubscription();

  return (
    <div className='min-h-screen bg-limestone pb-20'>
      {/* Header */}
      <div className='bg-limestone px-6 pb-6 pt-safe'>
        <div className='flex justify-between items-center'>
          <h1 className='text-3xl font-title text-umber'>Welcome</h1>
          <SettingsButton />
        </div>
      </div>

      {/* Main content */}
      <div className='p-6 space-y-6'>
        <div className='bg-oat rounded-2xl p-6 border border-border-warm'>
          <h2 className='text-xl font-semibold text-umber mb-3'>
            Your App Name
          </h2>
          <p className='text-umber-muted'>
            This is a placeholder home screen. Customize this page to fit your
            app&apos;s needs.
          </p>
        </div>

        {/* Premium CTA for free users */}
        {!isPremium && (
          <div
            className='rounded-2xl px-5 py-5 text-umber shadow-sm'
            style={{
              background: 'linear-gradient(to bottom right, #F5EDE5, #E8E4D9)',
            }}>
            <h3 className='font-bold text-lg'>Go Premium</h3>
            <ul className='mt-3 space-y-1 text-sm'>
              <li className='flex items-center gap-2'>
                <span className='text-sage'>●</span> Premium Feature 1
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-sage'>●</span> Premium Feature 2
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-sage'>●</span> Remove Ads
              </li>
            </ul>

            <button
              onClick={() => presentPaywall()}
              className='mt-4 bg-olive text-oat font-semibold px-6 py-2.5 rounded-full text-sm shadow-lg active:scale-[0.98] transition-all'>
              View Premium
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

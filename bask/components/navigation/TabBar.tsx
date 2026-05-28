'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ROUTES } from '../../lib/constants';
import { useModal } from '../../contexts/ModalContext';
import Mascot from '../ui/Mascot';

interface TabConfig {
  path: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

// Icons — Home tab swaps to mascot when active
const icons = {
  home: (active: boolean) => (
    active ? (
      <Mascot size={28} mood="happy" floating={false} className="" />
    ) : (
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.8} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' />
      </svg>
    )
  ),
  history: (active: boolean) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={active ? 2 : 1.8} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' />
    </svg>
  ),
  insights: (active: boolean) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={active ? 2 : 1.8} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' />
    </svg>
  ),
  settings: (active: boolean) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={active ? 2 : 1.8} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z' />
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
    </svg>
  ),
};

const tabs: TabConfig[] = [
  {
    path: ROUTES.home,
    label: 'Home',
    icon: icons.home,
  },
  {
    path: ROUTES.history,
    label: 'History',
    icon: icons.history,
  },
  {
    path: ROUTES.insights,
    label: 'Insights',
    icon: icons.insights,
  },
  {
    path: ROUTES.settings,
    label: 'Settings',
    icon: icons.settings,
  },
];

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isModalOpen, isSessionActive } = useModal();

  // Hide TabBar when modal/sheet is open or session is active
  if (isModalOpen || isSessionActive) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === ROUTES.home) {
      return pathname === path || pathname === '/';
    }
    return pathname === path;
  };

  const handleTabPress = async (path: string) => {
    // Trigger native haptic feedback
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available (web preview)
    }

    // Use Next.js client-side routing for smooth transitions
    router.push(path);
  };

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe'>
      <div className='tab-bar-pill mb-2'>
        <div className='flex justify-around items-center h-14'>
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleTabPress(tab.path)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active ? 'text-[#F4A536]' : 'text-[#7A6E58]'
                }`}>
                {/* Soft yellow glow behind active icon */}
                {active && (
                  <div className='absolute top-1.5 w-10 h-10 rounded-full bg-[#FFC93C22]' aria-hidden='true' />
                )}
                <div className='relative z-10'>{tab.icon(active)}</div>
                <span
                  className={`relative z-10 text-[11px] mt-0.5 ${
                    active ? 'font-extrabold' : 'font-medium'
                  }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageview } from '../../lib/analytics';

/**
 * Records a manual `$pageview` on every route change. Auto-pageview is disabled
 * in the PostHog config, so this is the single place screen views are emitted.
 * Renders nothing.
 */
export default function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

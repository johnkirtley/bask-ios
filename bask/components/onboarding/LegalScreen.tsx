'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { legalContent } from '../../lib/onboardingData';

const SCROLL_THRESHOLD_PX = 20;

interface LegalScreenProps {
  onAgree: () => void;
}

export default function LegalScreen({ onAgree }: LegalScreenProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // If content fits entirely on screen (no scroll needed), enable button
    const isScrollable = scrollHeight > clientHeight + 1;
    if (!isScrollable) {
      setHasScrolledToBottom(true);
      return;
    }

    // Check if user has scrolled to bottom
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD_PX;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  }, []);

  // Check on mount and resize (handles orientation changes)
  useEffect(() => {
    // Small delay to ensure content has rendered
    const timeoutId = setTimeout(checkScrollPosition, 100);

    window.addEventListener('resize', checkScrollPosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  const handleLinkPress = async (url: string) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
      } else {
        window.open(url, '_blank');
      }
    } catch {
      // Link open failed silently
    }
  };

  const handleAgree = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onAgree();
  };

  return (
    <div className="flex flex-col h-full px-6 pt-safe">
      <div className="pt-4 pb-4">
        <h1 className="text-[28px] font-title text-umber text-center leading-tight">
          {legalContent.title}
        </h1>
        <p className="text-center text-umber-muted mt-2 text-[15px]">
          {legalContent.subtitle}
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={checkScrollPosition}
        className="flex-1 overflow-y-auto pb-4"
        role="article"
        aria-label="Terms and safety information"
      >
        <div className="space-y-6">
          {legalContent.sections.map((section, index) => (
            <div key={index}>
              <h2 className="text-[15px] font-semibold text-umber mb-2">
                {section.title}
              </h2>
              {index === legalContent.sections.length - 1 ? (
                <p className="text-[15px] text-umber-muted leading-relaxed">
                  By tapping &quot;I Agree,&quot; you confirm you have read and accepted our{' '}
                  <button
                    onClick={() => handleLinkPress(legalContent.links.privacyPolicy)}
                    className="text-olive underline"
                    aria-label="Open Privacy Policy in browser"
                  >
                    Privacy Policy
                  </button>{' '}
                  and{' '}
                  <button
                    onClick={() => handleLinkPress(legalContent.links.termsOfService)}
                    className="text-olive underline"
                    aria-label="Open Terms of Service in browser"
                  >
                    Terms of Service
                  </button>
                  .
                </p>
              ) : (
                <p className="text-[15px] text-umber-muted leading-relaxed">
                  {section.content}
                </p>
              )}
            </div>
          ))}
        </div>

        {!hasScrolledToBottom && (
          <div className="flex items-center justify-center mt-6 text-umber-muted text-sm">
            <svg
              className="w-4 h-4 mr-1 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            Scroll to continue
          </div>
        )}
      </div>

      <div className="py-4 pb-safe">
        <button
          onClick={handleAgree}
          disabled={!hasScrolledToBottom}
          className={`w-full py-4 rounded-full text-[17px] font-semibold transition-all duration-200 ${
            hasScrolledToBottom
              ? 'bg-olive text-oat active:scale-[0.98]'
              : 'bg-olive/30 text-oat/60 cursor-not-allowed'
          }`}
        >
          I Agree
        </button>
      </div>
    </div>
  );
}

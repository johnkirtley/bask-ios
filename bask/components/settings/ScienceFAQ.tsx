'use client';

import { useState } from 'react';
import { IonModal, IonContent } from '@ionic/react';

interface ScienceFAQProps {
  isOpen: boolean;
  onDismiss: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'vitamin-d-iu',
    question: 'How do you calculate Vitamin D (IU)?',
    answer:
      'We use a research-based formula that accounts for UV Index, session duration, skin exposure percentage, skin type, and age. The core formula is:\n\nIU = (UVI ÷ 10) × minutes × (exposure% ÷ 100) × (1 ÷ skin multiplier) × age factor × base rate\n\nBase rate: 100 IU/min at UV 10, 100% exposure, Type I skin, age <30.\n\nKey factors:\n• Shadow Rule: UV Index must be ≥3 for vitamin D synthesis (UVB threshold)\n• Biological Saturation: We cap synthesis at your time-to-burn (~1 MED)\n• Skin Type Multipliers: Type I = 1.0×, Type II = 1.3×, Type III = 1.6×, Type IV = 2.5×, Type V = 4.0×, Type VI = 5.0× (darker skin requires more exposure)\n• Age Factor: <30 = 1.0×, 30-49 = 0.8×, 50-69 = 0.5×, 70+ = 0.3×\n• Cloud Adjustment: When cloud cover is available, we use cloud-adjusted UV for vitamin D estimates',
  },
  {
    id: 'sunburn-time',
    question: 'How is sunburn time calculated?',
    answer:
      'Sunburn time is based on the concept of MED (Minimal Erythemal Dose) - the amount of UV exposure needed to cause visible redness 24 hours later.\n\nFormula:\nMinutes to Burn = MED at UV 1 ÷ current UV Index\n\nMED baselines (at UV Index 1):\n• Fitzpatrick Type I: 67 minutes\n• Type II: 100 minutes\n• Type III: 200 minutes\n• Type IV: 300 minutes\n• Type V: 400 minutes\n• Type VI: 500 minutes\n\nExample: At UV 8, a Type II person would burn in ~13 minutes (100 ÷ 8, rounded).',
  },
  {
    id: 'd-window-forecast',
    question: 'How does the D-Window Forecast work?',
    answer:
      'The D-Window Forecast analyzes hourly weather data to find optimal vitamin D production windows:\n\n1. UV Filtering: Only considers hours with UV ≥3 (shadow rule threshold) between 8 AM - 6 PM\n\n2. Scoring System:\n   • UV Score: min(UV÷8, 1) × 10 points\n   • Cloud Score: (1 - cloud cover) × 5 points\n   • Best contiguous 1-3 hour window selected\n\n3. Cloud Attenuation: Effective UV = raw UV × (1 - cloud cover × 0.7)\n   Heavy clouds can block up to 70% of UVB\n\n4. Session Calculation: Estimates minutes needed to reach your daily IU goal, capped at 60 min and your burn threshold\n\n5. Viability Check: Rejects windows if estimated IU < 100 (minimum viable production)\n\nEfficiency ratings: UV ≥5 = excellent, ≥3 = good, ≥2 = moderate, <2 = poor',
  },
  {
    id: 'vitamin-d-decay',
    question: 'How does Vitamin D decay work?',
    answer:
      'Vitamin D has a biological half-life of approximately 15 days. We model decay using exponential decay:\n\nRemaining IU = Initial IU × (0.5 ^ (days elapsed ÷ 15))\n\nDaily decay rate: ~4.48%\n\nExamples:\n• 5,000 IU produced today → ~2,500 IU remain after 15 days\n• 5,000 IU produced today → ~1,250 IU remain after 30 days\n\nThis is why consistent sun exposure is important - your body maintains steady vitamin D levels when you replenish as it naturally decays.',
  },
  {
    id: 'skin-type',
    question: 'How do you determine my skin type?',
    answer:
      'We use the Fitzpatrick Skin Type classification (Types I-VI), the medical standard for assessing UV sensitivity:\n\n1. Base skin tone: Maps your selected skin tone to a score (1-6)\n\n2. Sun reaction modifier: Adjusts based on how you typically react:\n   • Burns easily: -0.5\n   • Tans gradually: 0\n   • Tans easily: +0.5\n\n3. Final type: Clamped to valid range (I-VI)\n\nThis classification directly affects:\n• Your vitamin D production multiplier\n• Your sunburn time threshold\n• Recommended session durations\n\nExample: Medium skin tone + burns easily → Type III\nExample: Medium skin tone + tans easily → Type IV',
  },
  {
    id: 'clothing-exposure',
    question: 'How does clothing affect my exposure?',
    answer:
      "Body surface area exposed to UV directly impacts vitamin D synthesis. Our clothing presets estimate exposed skin percentage:\n\n• Tank Top: ~80% exposure\n• Gym Clothes: ~60% exposure\n• T-Shirt & Shorts: ~50% exposure\n• Casual Wear: ~30% exposure\n• Long Sleeves: ~10% exposure\n\nVitamin D production is proportional to exposure - if you're 50% covered, you'll produce roughly half the IU compared to 100% exposure under the same conditions.\n\nTip: Arms and legs are optimal for vitamin D production. Even with long sleeves, rolling them up increases exposure significantly.",
  },
  {
    id: 'data-privacy',
    question: 'Where is my data stored?',
    answer:
      "Privacy by default:\n\n• All vitamin D calculations run on your device. Session history, supplement logs, and profile data stay local unless you opt into the Touch Grass Leaderboard.\n• We use PostHog for anonymous app usage and performance monitoring. No names, email, or health records are sent.\n• If you join the leaderboard, only an anonymous name, a random public ID, and your per-session sun-exposure IU + duration are sent. Optional country/region/city labels are only sent if you choose to show them.\n• Weather/UV data is fetched from Apple WeatherKit.\n• Apple Health sync (if enabled) goes directly to your Health app.\n• The leaderboard is fully opt-in and can be turned off or deleted anytime in Settings.",
  },
];

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className={`w-5 h-5 transition-transform duration-200 ${
      isOpen ? 'rotate-180' : ''
    }`}>
    <path d='M6 9l6 6 6-6' />
  </svg>
);

export default function ScienceFAQ({ isOpen, onDismiss }: ScienceFAQProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <div className='h-full flex flex-col bg-limestone'>
        {/* Header with safe area */}
        <div className='px-6 pt-safe pb-4 flex items-center justify-between border-b border-black/5'>
          <h2 className='text-2xl font-semibold text-text-primary'>
            How We Calculate
          </h2>
          <button
            onClick={onDismiss}
            className='text-solar-flare font-medium text-[17px] active:opacity-60 transition-opacity'>
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <IonContent>
          <div className='px-6 py-6'>
            <p className='text-sm text-text-secondary mb-6'>
              The science behind your vitamin D insights
            </p>
            <div className='space-y-3'>
              {faqItems.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
                    <button
                      onClick={() => toggleItem(item.id)}
                      className='w-full p-4 flex items-center justify-between text-left active:bg-black/5 transition-colors'>
                      <span className='font-medium text-text-primary pr-3'>
                        {item.question}
                      </span>
                      <ChevronDownIcon isOpen={isExpanded} />
                    </button>
                    {isExpanded && (
                      <div className='px-4 pb-4 pt-0'>
                        <div className='text-sm text-text-secondary leading-relaxed whitespace-pre-line'>
                          {item.answer}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </IonContent>
      </div>
    </IonModal>
  );
}

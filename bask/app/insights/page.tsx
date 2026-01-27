'use client';

import { useState } from 'react';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { deriveFitzpatrickType } from '../../lib/dEngine';
import AtmosphericBackground from '../../components/home/AtmosphericBackground';

type InsightCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  content: string[];
  tips?: string[];
};

export default function Insights() {
  const { answers } = useOnboardingContext();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Calculate Fitzpatrick type from onboarding
  const fitzpatrickType = answers.skinTone && answers.sunReaction
    ? deriveFitzpatrickType(answers.skinTone, answers.sunReaction)
    : 2;

  const insights: InsightCard[] = [
    {
      id: 'vitamin-d-basics',
      title: 'Vitamin D Basics',
      subtitle: 'Why the "sunshine vitamin" matters',
      icon: 'sun',
      content: [
        'Vitamin D is essential for calcium absorption, bone health, immune function, and mood regulation.',
        'Your body produces vitamin D when UVB rays from sunlight interact with cholesterol in your skin.',
        'Most people need 5,000-10,000 IU per day, but individual needs vary based on skin type, location, and lifestyle.',
        'Vitamin D is fat-soluble, meaning it\'s stored in fat tissue and metabolized over time with a 15-day half-life.',
      ],
      tips: [
        'Blood tests measure 25(OH)D levels. Optimal range: 40-60 ng/mL',
        'Sun exposure is the most natural source, but supplements can help during winter months',
      ],
    },
    {
      id: 'k2-synergy',
      title: 'Vitamin K2 Synergy',
      subtitle: 'D3\'s critical partner',
      icon: 'shield',
      content: [
        'Vitamin K2 works synergistically with vitamin D to ensure calcium goes to bones, not arteries.',
        'Without K2, high-dose vitamin D can lead to arterial calcification (calcium buildup in blood vessels).',
        'K2 activates proteins like osteocalcin (bone building) and matrix Gla-protein (prevents arterial calcification).',
        'If you\'re taking high-dose vitamin D (5,000+ IU daily), K2 supplementation is recommended.',
      ],
      tips: [
        'Food sources: Natto (fermented soybeans), hard cheeses, egg yolks, grass-fed butter',
        'Supplement form: MK-7 (menaquinone-7) has longer half-life than MK-4',
        'Recommended dose: 100-200 mcg daily for every 5,000 IU of vitamin D',
      ],
    },
    {
      id: 'magnesium-balance',
      title: 'Magnesium Balance',
      subtitle: 'The activation enzyme',
      icon: 'bolt',
      content: [
        'Magnesium is required to convert vitamin D into its active form (calcitriol) in the liver and kidneys.',
        'Without adequate magnesium, your vitamin D levels won\'t rise as expected, even with sun exposure or supplements.',
        'Up to 50% of people are magnesium-deficient, making D supplementation less effective.',
        'Magnesium also supports 300+ enzymatic reactions, including muscle function, energy production, and sleep.',
      ],
      tips: [
        'Food sources: Dark leafy greens, nuts, seeds, dark chocolate, avocados',
        'Supplement forms: Magnesium glycinate (best absorption, gentle on stomach), citrate (laxative effect), threonate (brain health)',
        'Recommended dose: 300-400 mg daily for optimal vitamin D metabolism',
        'Signs of deficiency: Muscle cramps, fatigue, poor sleep, anxiety',
      ],
    },
    {
      id: 'skin-type-guide',
      title: `Your Skin Type Guide`,
      subtitle: `Fitzpatrick Type ${fitzpatrickType}`,
      icon: 'user',
      content: getSkinTypeContent(fitzpatrickType),
      tips: getSkinTypeTips(fitzpatrickType),
    },
    {
      id: 'optimal-timing',
      title: 'Optimal Sun Exposure',
      subtitle: 'When and how to bask',
      icon: 'clock',
      content: [
        'The "sweet spot" for vitamin D synthesis is when UV Index is 3-8 (typically 10am-2pm).',
        'Solar noon (when the sun is highest) produces the most UVB rays for vitamin D.',
        'Expose as much skin as possible: arms, legs, back. Face and hands alone aren\'t enough.',
        'Start with short sessions (10-20 minutes) to avoid burning, then gradually increase.',
        'Cloud cover reduces UVB by 50-90%. Overcast days may require 2-3x longer exposure.',
      ],
      tips: [
        'Never burn. Burning damages skin and increases cancer risk without additional vitamin D benefit',
        'After optimal exposure time, cover up or use sunscreen to prevent damage',
        'Glass blocks UVB rays. Sunbathing through windows doesn\'t produce vitamin D',
      ],
    },
    {
      id: 'cofactor-protocol',
      title: 'The Full D-Stack',
      subtitle: 'Complete nutrient synergy',
      icon: 'layers',
      content: [
        'Vitamin D doesn\'t work in isolation. It requires cofactors for optimal metabolism and safety.',
        'The "Full D-Stack" protocol: Vitamin D + K2 + Magnesium + sufficient calcium intake.',
        'This combination maximizes bone health while preventing arterial calcification.',
        'Many people supplement vitamin D alone and wonder why they don\'t feel better—missing cofactors are the culprit.',
      ],
      tips: [
        'D3 (cholecalciferol) is more effective than D2 (ergocalciferol)',
        'Take vitamin D with a fatty meal for better absorption',
        'Don\'t megadose. More isn\'t always better—aim for steady daily intake',
      ],
    },
    {
      id: 'winter-strategy',
      title: 'Winter Strategy',
      subtitle: 'Maintaining levels during dark months',
      icon: 'snowflake',
      content: [
        'North of 37° latitude (San Francisco, Washington DC), UVB rays are insufficient for vitamin D synthesis from November-March.',
        'Your body draws on stored vitamin D during winter, but levels gradually decline.',
        'Supplementation is essential during winter months if you can\'t travel to sunny locations.',
        'Some people experience Seasonal Affective Disorder (SAD) partly due to low vitamin D.',
      ],
      tips: [
        'Baseline blood test in fall, follow-up in late winter to track decline',
        'Increase supplement dose during winter months (e.g., 5,000 IU → 8,000 IU)',
        'Red light therapy can help with mood but doesn\'t produce vitamin D',
      ],
    },
  ];

  const selectedInsight = insights.find((i) => i.id === selectedCard);

  const getIconSvg = (iconType: string) => {
    switch (iconType) {
      case 'sun':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
          />
        );
      case 'shield':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
          />
        );
      case 'bolt':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
          />
        );
      case 'user':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
          />
        );
      case 'clock':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        );
      case 'layers':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3'
          />
        );
      case 'snowflake':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 3v18m9-9H3m15.364-6.364L5.636 18.364m0-12.728L18.364 18.364'
          />
        );
      default:
        return null;
    }
  };

  if (selectedInsight) {
    return (
      <AtmosphericBackground>
        <div className='min-h-screen pb-20'>
          {/* Header with back button */}
          <div className='px-6 py-6 pt-safe'>
            <button
              onClick={() => setSelectedCard(null)}
              className='flex items-center gap-2 text-golden-glow mb-4 active:scale-95 transition-transform'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-5 h-5'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
              </svg>
              <span className='font-medium'>Back to Insights</span>
            </button>

            <h1 className='text-3xl font-semibold text-white'>{selectedInsight.title}</h1>
            <p className='text-text-secondary mt-1'>{selectedInsight.subtitle}</p>
          </div>

          {/* Content */}
          <div className='px-6 space-y-4'>
            {selectedInsight.content.map((paragraph, index) => (
              <div
                key={index}
                className='backdrop-blur-xl bg-white/10 rounded-xl p-5 border border-white/20'>
                <p className='text-white leading-relaxed'>{paragraph}</p>
              </div>
            ))}

            {selectedInsight.tips && selectedInsight.tips.length > 0 && (
              <div className='backdrop-blur-xl bg-golden-glow/10 rounded-xl p-5 border border-golden-glow/30 mt-6'>
                <h3 className='text-golden-glow font-semibold mb-3 flex items-center gap-2'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke='currentColor'
                    className='w-5 h-5'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
                    />
                  </svg>
                  Key Takeaways
                </h3>
                <ul className='space-y-2'>
                  {selectedInsight.tips.map((tip, index) => (
                    <li key={index} className='text-text-secondary text-sm leading-relaxed flex gap-2'>
                      <span className='text-golden-glow mt-1'>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </AtmosphericBackground>
    );
  }

  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-3xl font-semibold text-white'>Insights</h1>
          <p className='text-text-secondary mt-1'>Learn how to optimize your vitamin D</p>
        </div>

        {/* Insight cards grid */}
        <div className='px-6 grid grid-cols-1 gap-4'>
          {insights.map((insight) => (
            <button
              key={insight.id}
              onClick={() => setSelectedCard(insight.id)}
              className='backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20 text-left active:scale-[0.98] transition-all'>
              <div className='flex items-start gap-4'>
                <div className='flex-shrink-0 w-12 h-12 rounded-full bg-golden-glow/20 flex items-center justify-center'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke='currentColor'
                    className='w-6 h-6 text-golden-glow'>
                    {getIconSvg(insight.icon)}
                  </svg>
                </div>
                <div className='flex-1'>
                  <h3 className='text-white font-semibold text-lg'>{insight.title}</h3>
                  <p className='text-text-secondary text-sm mt-1'>{insight.subtitle}</p>
                </div>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  stroke='currentColor'
                  className='w-5 h-5 text-text-secondary flex-shrink-0'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AtmosphericBackground>
  );
}

function getSkinTypeContent(type: number): string[] {
  switch (type) {
    case 1:
      return [
        'Fitzpatrick Type I: Very fair skin, light eyes, often red or blonde hair.',
        'You burn very easily and rarely tan. Your skin produces vitamin D quickly but has low melanin protection.',
        'Optimal exposure: 10-15 minutes at UV 5, 5-10 minutes at UV 8.',
        'You need the least sun exposure time but must be most careful about burning.',
      ];
    case 2:
      return [
        'Fitzpatrick Type II: Fair skin, light eyes, blonde to light brown hair.',
        'You usually burn before tanning. Moderate vitamin D synthesis rate.',
        'Optimal exposure: 15-20 minutes at UV 5, 10-15 minutes at UV 8.',
        'Balance is key: enough time for vitamin D, not so long you burn.',
      ];
    case 3:
      return [
        'Fitzpatrick Type III: Medium skin, any eye color, brown hair.',
        'You sometimes burn but usually tan. Good vitamin D synthesis with moderate burn risk.',
        'Optimal exposure: 20-30 minutes at UV 5, 15-20 minutes at UV 8.',
        'You have a wider "sweet spot" window than lighter skin types.',
      ];
    case 4:
      return [
        'Fitzpatrick Type IV: Olive or light brown skin, dark hair.',
        'You rarely burn and tan easily. Your skin has more melanin, requiring longer exposure.',
        'Optimal exposure: 30-45 minutes at UV 5, 20-30 minutes at UV 8.',
        'Living in northern latitudes may require supplementation even in summer.',
      ];
    case 5:
      return [
        'Fitzpatrick Type V: Brown skin, dark hair and eyes.',
        'You very rarely burn. High melanin protection requires significantly longer sun exposure.',
        'Optimal exposure: 45-60 minutes at UV 5, 30-45 minutes at UV 8.',
        'Vitamin D deficiency is common in darker skin types living far from the equator.',
      ];
    case 6:
      return [
        'Fitzpatrick Type VI: Dark brown to black skin, dark hair and eyes.',
        'You almost never burn. Maximum melanin protection means you need the longest sun exposure.',
        'Optimal exposure: 60-90+ minutes at UV 5, 45-60+ minutes at UV 8.',
        'Supplementation is often necessary, especially outside tropical regions.',
      ];
    default:
      return ['Your skin type determines optimal sun exposure duration.'];
  }
}

function getSkinTypeTips(type: number): string[] {
  if (type <= 2) {
    return [
      'Start with shorter sessions and gradually increase',
      'Never let your skin turn pink or red',
      'Use sunscreen after reaching your vitamin D exposure goal',
      'Consider multiple short sessions (15 min 2x/day) instead of one long session',
    ];
  } else if (type <= 4) {
    return [
      'You have more flexibility with timing but still avoid midday burns',
      'Expose large skin areas (arms, legs, back) for efficient synthesis',
      'Track your sessions to ensure you\'re getting enough exposure',
    ];
  } else {
    return [
      'Longer exposure times are essential—don\'t cut sessions short',
      'Consider year-round supplementation (2,000-5,000 IU daily) as a baseline',
      'Blood tests are critical to verify you\'re reaching optimal levels',
      'Midday sun (UV 5-8) is most efficient—avoid wasting time in weak morning/evening UV',
    ];
  }
}

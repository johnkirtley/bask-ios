'use client';

import { useState, useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { deriveFitzpatrickType } from '../../lib/dEngine';
import AtmosphericBackground from '../../components/home/AtmosphericBackground';
import VitaminDTrendChart from '../../components/history/VitaminDTrendChart';

type InsightCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  content: string[];
  tips?: string[];
  accentColor: string; // Unique color for each topic
  gradientFrom: string; // Gradient start color
  gradientTo: string; // Gradient end color
  pullQuote?: string; // Key sentence to highlight
  sources?: { label: string; url: string }[]; // tappable citation links
  citation?: string; // attribution line, e.g. "Harvard Medical School, AJCN (2025)"
};

export default function Insights() {
  const { answers } = useOnboardingContext();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trends' | 'learn'>('trends');

  // Calculate Fitzpatrick type from onboarding
  const fitzpatrickType = answers.skinTone && answers.sunReaction
    ? deriveFitzpatrickType(answers.skinTone, answers.sunReaction)
    : 2;

  const insights: InsightCard[] = [
    {
      id: 'aging-telomeres',
      title: 'Vitamin D & Healthy Aging',
      subtitle: 'A Harvard trial linked it to slower aging',
      icon: 'sparkles',
      accentColor: '#FFC93C',
      gradientFrom: 'rgba(255, 201, 60, 0.15)',
      gradientTo: 'rgba(244, 165, 54, 0.10)',
      pullQuote: 'A Harvard trial linked daily vitamin D to slower biological aging.',
      content: [
        'In a randomized, placebo-controlled study of over 1,000 adults aged 50+, participants taking 2,000 IU of vitamin D daily showed less than half the telomere shortening of those on placebo over four years — roughly the equivalent of three fewer years of aging.',
        'Telomeres are the protective caps on your DNA that naturally wear down as you age.',
      ],
      citation: 'Harvard Medical School & Mass General Brigham · American Journal of Clinical Nutrition (2025)',
      sources: [
        { label: 'Harvard Gazette', url: 'https://news.harvard.edu/gazette/story/2025/05/vitamin-d-supplements-may-slow-biological-aging/' },
        { label: 'Harvard Health', url: 'https://www.health.harvard.edu/staying-healthy/daily-vitamin-d-supplements-may-help-slow-aging' },
      ],
    },
    {
      id: 'immunity-inflammation',
      title: 'Immunity & Inflammation',
      subtitle: 'Fewer autoimmune conditions, lower inflammation',
      icon: 'shield',
      accentColor: '#5BB47A',
      gradientFrom: 'rgba(91, 180, 122, 0.15)',
      gradientTo: 'rgba(91, 180, 122, 0.10)',
      pullQuote: 'The same trial associated vitamin D with fewer autoimmune conditions and lower inflammation.',
      content: [
        'Alongside the aging findings, the vitamin D group developed fewer new autoimmune diseases and showed reduced markers of inflammation.',
        'This is part of a growing body of evidence connecting vitamin D status to immune regulation.',
      ],
      citation: 'Harvard Medical School, VITAL Trial (2025)',
      sources: [
        { label: 'Harvard Gazette', url: 'https://news.harvard.edu/gazette/story/2025/05/vitamin-d-supplements-may-slow-biological-aging/' },
      ],
    },
    {
      id: 'timing-location',
      title: 'Why Timing & Location Matter',
      subtitle: 'Season, latitude, and time of day',
      icon: 'clock',
      accentColor: '#F59E0B',
      gradientFrom: 'rgba(245, 158, 11, 0.15)',
      gradientTo: 'rgba(217, 119, 6, 0.10)',
      pullQuote: 'Where and when you get sun changes how much vitamin D you can make.',
      content: [
        'The sun\'s UVB rays are what trigger vitamin D production in your skin — but their strength depends on season, latitude, and time of day.',
        'In northern cities like Boston, the sun is too weak to produce meaningful vitamin D from roughly November through February. This is exactly why tracking your real sun window beats simply "getting outside."',
      ],
      citation: 'Harvard Health Publishing — "6 Things You Should Know About Vitamin D"',
      sources: [
        { label: 'Harvard Health', url: 'https://www.health.harvard.edu/healthy-aging-and-longevity/6-things-you-should-know-about-vitamin-d' },
      ],
    },
    {
      id: 'how-much-sun',
      title: 'How Much Sun You Actually Need',
      subtitle: 'Short, regular sessions add up',
      icon: 'sun',
      accentColor: '#F4A536',
      gradientFrom: 'rgba(244, 165, 54, 0.15)',
      gradientTo: 'rgba(244, 165, 54, 0.10)',
      pullQuote: 'Short, regular sun sessions can support healthy vitamin D levels.',
      content: [
        'General guidance suggests around 10–15 minutes of midday sun on bare skin (like arms and legs), a few times per week, can help maintain healthy levels for many people.',
        'Skin tone, age, location, and sunscreen all shift the amount needed — which is why personalized tracking matters.',
      ],
      citation: 'Harvard Health Publishing',
      sources: [
        { label: 'Harvard Health', url: 'https://www.health.harvard.edu/healthy-aging-and-longevity/6-things-you-should-know-about-vitamin-d' },
      ],
    },
    {
      id: 'deficiency-prevalence',
      title: 'How Common Deficiency Is',
      subtitle: 'A large share of Americans fall short',
      icon: 'user',
      accentColor: '#A8DADC',
      gradientFrom: 'rgba(168, 218, 220, 0.15)',
      gradientTo: 'rgba(136, 204, 206, 0.10)',
      pullQuote: 'A large share of Americans don\'t get enough vitamin D.',
      content: [
        'National survey (NHANES) estimates vary by the threshold used: roughly 1 in 4 adults is considered deficient, and a substantially larger share fall below levels many researchers consider optimal.',
        'Risk is higher for people with darker skin, those who live farther from the equator, and during winter.',
      ],
      citation: 'NHANES — U.S. National Health and Nutrition Examination Survey',
      sources: [
        { label: 'NCBI / PMC', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6075634/' },
      ],
    },
    {
      id: 'beyond-vitamin-d',
      title: 'Sunlight Beyond Vitamin D',
      subtitle: 'Mood, immunity, and more',
      icon: 'layers',
      accentColor: '#06B6D4',
      gradientFrom: 'rgba(6, 182, 212, 0.15)',
      gradientTo: 'rgba(8, 145, 178, 0.10)',
      pullQuote: 'Sunlight affects far more than bone health.',
      content: [
        'The active form of vitamin D is thought to help regulate over 1,000 genes across the body.',
        'Beyond vitamin D itself, sun exposure has been associated with improved mood, immune function, and cardiovascular effects — supporting the idea that healthy sun habits are about more than a single nutrient.',
      ],
      citation: 'Environmental Health Perspectives (NIH) — "Benefits of Sunlight: A Bright Spot for Human Health"',
      sources: [
        { label: 'NCBI / PMC', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2290997/' },
      ],
    },
    {
      id: 'vitamin-d-basics',
      title: 'Vitamin D Basics',
      subtitle: 'Why the "sunshine vitamin" matters',
      icon: 'sun',
      accentColor: '#FFC93C',
      gradientFrom: 'rgba(255, 201, 60, 0.15)',
      gradientTo: 'rgba(244, 165, 54, 0.10)',
      pullQuote: 'Your body produces vitamin D when UVB rays from sunlight interact with cholesterol in your skin.',
      content: [
        'Vitamin D is essential for calcium absorption, bone health, immune function, and mood regulation.',
        'Your body produces vitamin D when UVB rays from sunlight interact with cholesterol in your skin.',
        'Needs vary widely based on skin type, location, diet, and lifestyle. Discuss personal targets with a clinician.',
        'Vitamin D is fat-soluble, meaning it\'s stored in fat tissue and metabolized over time with a 15-day half-life.',
      ],
      tips: [
        'Blood tests measure 25(OH)D levels. Ask your clinician about targets.',
        'Sun exposure is the most natural source, but supplements can help during winter months',
      ],
    },
    {
      id: 'k2-synergy',
      title: 'Vitamin K2 Synergy',
      subtitle: 'D3\'s critical partner',
      icon: 'shield',
      accentColor: '#5BB47A',
      gradientFrom: 'rgba(16, 185, 129, 0.15)',
      gradientTo: 'rgba(5, 150, 105, 0.10)',
      pullQuote: 'Vitamin K2 works with vitamin D to support healthy calcium utilization.',
      content: [
        'Vitamin K2 works with vitamin D to support calcium utilization in the body.',
        'Researchers study K2\'s role in cardiovascular and bone health.',
        'K2 activates proteins like osteocalcin (bone building) and matrix Gla-protein (calcium regulation).',
        'If you supplement vitamin D, ask a clinician whether K2 is appropriate for you.',
      ],
      tips: [
        'Food sources: Natto (fermented soybeans), hard cheeses, egg yolks, grass-fed butter',
        'Supplement form: MK-7 (menaquinone-7) has longer half-life than MK-4',
        'Some people choose K2 supplements; ask a clinician about dosing',
      ],
    },
    {
      id: 'magnesium-balance',
      title: 'Magnesium Balance',
      subtitle: 'The activation enzyme',
      icon: 'bolt',
      accentColor: '#8B5CF6',
      gradientFrom: 'rgba(139, 92, 246, 0.15)',
      gradientTo: 'rgba(124, 58, 237, 0.10)',
      pullQuote: 'Magnesium is required to convert vitamin D into its active form in the liver and kidneys.',
      content: [
        'Magnesium is required to convert vitamin D into its active form (calcitriol) in the liver and kidneys.',
        'Without adequate magnesium, your vitamin D levels won\'t rise as expected, even with sun exposure or supplements.',
        'Many people have low magnesium intake, which can make D supplementation less effective.',
        'Magnesium also supports 300+ enzymatic reactions, including muscle function, energy production, and sleep.',
      ],
      tips: [
        'Food sources: Dark leafy greens, nuts, seeds, dark chocolate, avocados',
        'Supplement forms: Magnesium glycinate (best absorption, gentle on stomach), citrate (laxative effect), threonate (brain health)',
        'If you supplement magnesium, ask a clinician about dosing',
        'Possible signs can include muscle cramps, fatigue, or poor sleep',
      ],
    },
    {
      id: 'skin-type-guide',
      title: `Your Skin Type Guide`,
      subtitle: `Fitzpatrick Type ${fitzpatrickType}`,
      icon: 'user',
      accentColor: '#A8DADC',
      gradientFrom: 'rgba(168, 218, 220, 0.15)',
      gradientTo: 'rgba(136, 204, 206, 0.10)',
      pullQuote: getSkinTypePullQuote(fitzpatrickType),
      content: getSkinTypeContent(fitzpatrickType),
      tips: getSkinTypeTips(fitzpatrickType),
    },
    {
      id: 'optimal-timing',
      title: 'Optimal Sun Exposure',
      subtitle: 'When and how to bask',
      icon: 'clock',
      accentColor: '#F59E0B',
      gradientFrom: 'rgba(245, 158, 11, 0.15)',
      gradientTo: 'rgba(217, 119, 6, 0.10)',
      pullQuote: 'Solar noon produces the most UVB rays for vitamin D synthesis.',
      content: [
        'The "sweet spot" for vitamin D synthesis is when UV Index is 3-8 (typically 10am-2pm).',
        'Solar noon (when the sun is highest) produces the most UVB rays for vitamin D.',
        'More skin exposure to sunlight may increase vitamin D synthesis. Face and hands alone may not be enough.',
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
      accentColor: '#06B6D4',
      gradientFrom: 'rgba(6, 182, 212, 0.15)',
      gradientTo: 'rgba(8, 145, 178, 0.10)',
      pullQuote: 'Vitamin D requires cofactors for optimal metabolism and safety.',
      content: [
        'Vitamin D doesn\'t work in isolation. Some research suggests it may benefit from cofactors.',
        'A common combination some people consider: Vitamin D + K2 + Magnesium + sufficient calcium intake.',
        'This combination may support bone health and healthy calcium utilization.',
        'Many people supplement vitamin D alone. Some research suggests cofactors may enhance effectiveness.',
      ],
      tips: [
        'D3 (cholecalciferol) is more effective than D2 (ergocalciferol)',
        'Some people take vitamin D with meals containing fat.',
        'Consistency may matter more than large single doses. Consult your provider.',
      ],
    },
    {
      id: 'winter-strategy',
      title: 'Winter Strategy',
      subtitle: 'Maintaining levels during dark months',
      icon: 'snowflake',
      accentColor: '#3B82F6',
      gradientFrom: 'rgba(59, 130, 246, 0.15)',
      gradientTo: 'rgba(37, 99, 235, 0.10)',
      pullQuote: 'Many people choose supplementation during winter months at northern latitudes.',
      content: [
        'North of 37° latitude (San Francisco, Washington DC), UVB rays are insufficient for vitamin D synthesis from November-March.',
        'Your body draws on stored vitamin D during winter, but levels gradually decline.',
        'Many people choose supplementation during winter months if they can\'t travel to sunny locations.',
        'Some people notice lower energy or mood during darker months.',
      ],
      tips: [
        'Some people choose a baseline blood test in fall and a follow-up in late winter',
        'Some people adjust intake during winter months; discuss with a clinician',
        'Light exposure can support circadian rhythm, but it doesn\'t produce vitamin D',
      ],
    },
    {
      id: 'sad-protocol',
      title: 'Seasonal Mood Support',
      subtitle: 'Light, routine, and vitamin D',
      icon: 'heart',
      accentColor: '#EC4899',
      gradientFrom: 'rgba(236, 72, 153, 0.15)',
      gradientTo: 'rgba(219, 39, 119, 0.10)',
      pullQuote: 'Light exposure supports circadian rhythm and daily energy.',
      content: [
        'Darker months can affect energy, sleep, and routine for some people.',
        'Vitamin D receptors are found throughout the body, including the brain.',
        'Light exposure and vitamin D status are active areas of research.',
        'Winter months combine reduced sunlight exposure with increased indoor time.',
        'Consistent routines (sleep, outdoor time, and movement) can help during low-light seasons.',
      ],
      tips: [
        'Track how you feel during winter months to identify patterns',
        'If you choose, discuss a blood test with a clinician',
        'Morning light exposure can support circadian rhythm',
        'Northern latitude residents (above 37°N) are at highest risk during November-March',
        'Some people use light boxes; consult a clinician for guidance',
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
      case 'heart':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
          />
        );
      case 'sparkles':
        return (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z'
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
              className='flex items-center gap-2 text-text-primary mb-4 active:scale-[0.98] transition-transform'>
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
          </div>

          {/* Hero Header with Icon and Gradient */}
          <div className='px-6 mb-6'>
            <div className='relative overflow-hidden rounded-card detail-hero-enter'
              style={{
                background: `linear-gradient(135deg, ${selectedInsight.gradientFrom}, ${selectedInsight.gradientTo})`,
              }}>
              {/* Radial gradient glow behind icon */}
              <div className='absolute inset-0 opacity-40'
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${selectedInsight.accentColor}40, transparent 60%)`,
                }} />

              <div className='relative px-6 py-8 text-center'>
                {/* Large decorative icon */}
                <div className='inline-flex items-center justify-center w-20 h-20 rounded-card mb-4'
                  style={{
                    background: `linear-gradient(135deg, ${selectedInsight.accentColor}30, ${selectedInsight.accentColor}20)`,
                  }}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke={selectedInsight.accentColor}
                    className='w-10 h-10'>
                    {getIconSvg(selectedInsight.icon)}
                  </svg>
                </div>

                <h1 className='text-[32px] font-extrabold tracking-[-0.02em] text-text-primary mb-2'>
                  {selectedInsight.title}
                </h1>
                <p className='text-text-secondary text-sm'>
                  {selectedInsight.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Content with Numbered Sections */}
          <div className='px-6 space-y-5'>
            {selectedInsight.content.map((paragraph, index) => (
              <div key={index}>
                {/* Numbered section */}
                <div
                  className='section-number-enter'
                  style={{ animationDelay: `${index * 100}ms` }}>
                  <div className='flex gap-4'>
                    {/* Large stylized number */}
                    <div className='flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl'
                      style={{
                        background: `linear-gradient(135deg, ${selectedInsight.accentColor}20, ${selectedInsight.accentColor}10)`,
                        color: selectedInsight.accentColor,
                      }}>
                      {index + 1}
                    </div>

                    {/* Paragraph content */}
                    <div className='flex-1 backdrop-blur-xl bg-white/70 rounded-card p-5 border border-black/5 shadow-sm'>
                      <p className='text-text-primary leading-relaxed'>{paragraph}</p>
                    </div>
                  </div>
                </div>

                {/* Pull quote after 2nd paragraph (or last, when content is short) */}
                {index === Math.min(1, selectedInsight.content.length - 1) && selectedInsight.pullQuote && (
                  <div className='pull-quote-enter mt-5 ml-14'>
                    <div className='backdrop-blur-xl bg-white/70 rounded-card p-5 border-l-4 shadow-sm'
                      style={{ borderLeftColor: selectedInsight.accentColor }}>
                      <p className='text-text-primary text-lg font-medium leading-relaxed italic'>
                        &ldquo;{selectedInsight.pullQuote}&rdquo;
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Key Takeaways - Enhanced Design */}
            {selectedInsight.tips && selectedInsight.tips.length > 0 && (
              <div className='mt-8 backdrop-blur-xl rounded-card p-6 border shadow-lg'
                style={{
                  background: `linear-gradient(135deg, ${selectedInsight.gradientFrom}, ${selectedInsight.gradientTo})`,
                  borderColor: `${selectedInsight.accentColor}40`,
                }}>
                <h3 className='font-bold text-lg mb-4 flex items-center gap-2'
                  style={{ color: selectedInsight.accentColor }}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2.5}
                    stroke='currentColor'
                    className='w-6 h-6'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
                    />
                  </svg>
                  Key Takeaways
                </h3>
                <ul className='space-y-3'>
                  {selectedInsight.tips.map((tip, index) => (
                    <li key={index} className='flex gap-3'>
                      {/* Icon per tip */}
                      <div className='flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center'
                        style={{
                          background: `${selectedInsight.accentColor}30`,
                        }}>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth={3}
                          stroke={selectedInsight.accentColor}
                          className='w-4 h-4'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 12.75l6 6 9-13.5' />
                        </svg>
                      </div>
                      <span className='text-text-primary text-sm leading-relaxed flex-1'>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources - tappable citations */}
            {selectedInsight.sources && selectedInsight.sources.length > 0 && (
              <div className='mt-8 backdrop-blur-xl bg-white/70 rounded-card p-6 border border-black/5 shadow-sm'>
                <h3 className='font-bold text-lg mb-2 flex items-center gap-2'
                  style={{ color: selectedInsight.accentColor }}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2.5}
                    stroke='currentColor'
                    className='w-6 h-6'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25'
                    />
                  </svg>
                  Sources
                </h3>
                {selectedInsight.citation && (
                  <p className='text-text-secondary text-xs leading-relaxed mb-4'>
                    {selectedInsight.citation}
                  </p>
                )}
                <div className='space-y-2'>
                  {selectedInsight.sources.map((source, index) => (
                    <button
                      key={index}
                      onClick={() => Browser.open({ url: source.url })}
                      className='w-full flex items-center gap-3 backdrop-blur-xl bg-white/70 rounded-xl p-3 border border-black/5 shadow-sm active:scale-[0.98] transition-transform text-left'>
                      <div className='flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center'
                        style={{ background: `${selectedInsight.accentColor}20` }}>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth={2}
                          stroke={selectedInsight.accentColor}
                          className='w-4 h-4'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25' />
                        </svg>
                      </div>
                      <span className='flex-1 text-text-primary text-sm font-medium'>{source.label}</span>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth={2}
                        stroke='currentColor'
                        className='w-5 h-5 text-text-secondary flex-shrink-0'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                      </svg>
                    </button>
                  ))}
                </div>
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
          <h1 className='text-[32px] font-extrabold tracking-[-0.02em] text-text-primary'>Insights</h1>
          <p className='text-text-secondary mt-1'>
            {activeTab === 'trends' ? 'Track your vitamin D progress' : 'Learn how to optimize your vitamin D'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className='px-6 mb-6'>
          <div className='flex gap-2 backdrop-blur-xl bg-white/60 p-1.5 rounded-card border border-white/40 shadow-md'>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'trends'
                  ? 'bg-bask-teal text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}>
              Trends
            </button>
            <button
              onClick={() => setActiveTab('learn')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'learn'
                  ? 'bg-bask-teal text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}>
              Learn
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className='px-6'>
          {activeTab === 'trends' ? (
            <div className='tab-content-fade space-y-4'>
              <VitaminDTrendChart />

              {/* Contextual Insight Callout */}
              <div className='backdrop-blur-xl bg-gradient-to-br from-bask-teal/10 to-bask-teal/5 rounded-card p-5 border border-bask-teal/20 shadow-sm'>
                <div className='flex items-start gap-4'>
                  {/* Icon */}
                  <div className='flex-shrink-0 w-10 h-10 rounded-xl bg-bask-teal/20 flex items-center justify-center'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={2}
                      stroke='currentColor'
                      className='w-6 h-6 text-bask-teal'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
                      />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className='flex-1'>
                    <h3 className='text-text-primary font-semibold mb-1'>Tracking Insights</h3>
                    <p className='text-text-secondary text-sm leading-relaxed'>
                      Consistent vitamin D tracking helps you understand your patterns and optimize your sun exposure timing.
                      Use your personal goal as a reference and discuss targets with a clinician if needed.
                    </p>
                  </div>
                </div>

                {/* Tips row */}
                <div className='mt-4 pt-4 border-t border-bask-teal/10 flex flex-wrap gap-2'>
                  <div className='flex items-center gap-2 text-xs text-text-secondary'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={2.5}
                      stroke='currentColor'
                      className='w-4 h-4 text-bask-teal'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' />
                    </svg>
                    <span>Best time: 10am-2pm</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs text-text-secondary'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={2.5}
                      stroke='currentColor'
                      className='w-4 h-4 text-bask-teal'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                    <span>Goal: Your personal target</span>
                  </div>
                  <div className='flex items-center gap-2 text-xs text-text-secondary'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={2.5}
                      stroke='currentColor'
                      className='w-4 h-4 text-bask-teal'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z' />
                    </svg>
                    <span>Blood tests can help track levels</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mixed grid layout: First card full-width hero, rest in 2-column */
            <div className='space-y-4 tab-content-fade'>
              {insights.map((insight, index) => {
                const isHero = index === 0;

                return (
                  <button
                    key={insight.id}
                    onClick={() => setSelectedCard(insight.id)}
                    className={`insight-card-enter backdrop-blur-xl bg-white/70 rounded-card p-5 border border-black/5 shadow-sm active:scale-[0.98] transition-all hover:shadow-md relative overflow-hidden ${
                      isHero ? 'col-span-2 text-center' : 'text-left'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      ...(isHero && {
                        background: `linear-gradient(135deg, ${insight.gradientFrom}, ${insight.gradientTo})`,
                      }),
                    }}>
                    {/* Subtle gradient strip on left edge for non-hero cards */}
                    {!isHero && (
                      <div className='absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl'
                        style={{
                          background: `linear-gradient(180deg, ${insight.accentColor}, ${insight.accentColor}80)`,
                        }} />
                    )}

                    <div className={`flex ${isHero ? 'flex-col items-center text-center gap-4' : 'items-center gap-4'}`}>
                      {/* Icon with gradient background - iOS app icon style */}
                      <div className={`flex-shrink-0 ${isHero ? 'w-16 h-16' : 'w-12 h-12'} rounded-card flex items-center justify-center shadow-sm`}
                        style={{
                          background: `linear-gradient(135deg, ${insight.accentColor}40, ${insight.accentColor}20)`,
                        }}>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth={2}
                          stroke={insight.accentColor}
                          className={isHero ? 'w-8 h-8' : 'w-6 h-6'}>
                          {getIconSvg(insight.icon)}
                        </svg>
                      </div>

                      <div className='flex-1 min-w-0'>
                        <h3 className={`text-text-primary font-semibold ${isHero ? 'text-xl' : 'text-lg'}`}>
                          {insight.title}
                        </h3>
                        <p className='text-text-secondary text-sm mt-1'>{insight.subtitle}</p>
                      </div>

                      {!isHero && (
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth={2}
                          stroke='currentColor'
                          className='w-5 h-5 text-text-secondary flex-shrink-0'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                        </svg>
                      )}
                    </div>

                    {isHero && (
                      <div className='mt-3 flex items-center justify-center gap-2 text-sm font-medium text-text-primary'>
                        <span>Read More</span>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                          strokeWidth={2}
                          stroke='currentColor'
                          className='w-4 h-4'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Disclaimer */}
          <div className='px-6 mt-8 mb-4'>
            <div className='backdrop-blur-xl bg-white/50 rounded-card p-4 border border-black/5 shadow-sm'>
              <p className='text-xs text-text-secondary text-center leading-relaxed'>
                This content is for informational purposes only and is not medical advice. Consult your healthcare provider before making changes to your supplement regimen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AtmosphericBackground>
  );
}

function getSkinTypePullQuote(type: number): string {
  if (type <= 2) {
    return 'Fair skin burns easily but produces vitamin D quickly—balance is key.';
  } else if (type <= 4) {
    return 'Medium to olive skin has a wider "sweet spot" for vitamin D synthesis.';
  } else {
    return 'Darker skin requires significantly longer sun exposure for optimal vitamin D.';
  }
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
        'Approximate exposure ranges vary by UV index and coverage; start conservatively.',
        'Living in northern latitudes may require supplementation even in summer.',
      ];
    case 5:
      return [
        'Fitzpatrick Type V: Brown skin, dark hair and eyes.',
        'You very rarely burn. High melanin protection requires significantly longer sun exposure.',
        'Approximate exposure ranges vary by UV index and coverage; start conservatively.',
        'Vitamin D deficiency is common in darker skin types living far from the equator.',
      ];
    case 6:
      return [
        'Fitzpatrick Type VI: Dark brown to black skin, dark hair and eyes.',
        'You almost never burn. Maximum melanin protection means you need the longest sun exposure.',
        'Approximate exposure ranges vary by UV index and coverage; start conservatively.',
        'Some people choose supplementation, especially outside tropical regions.',
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
      'Some people with darker skin types choose year-round supplementation; discuss with a clinician',
      'Blood tests can help you understand your levels',
      'Midday sun (UV 5-8) is most efficient—avoid wasting time in weak morning/evening UV',
    ];
  }
}

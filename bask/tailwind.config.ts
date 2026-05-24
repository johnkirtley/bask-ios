/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist ensures dynamically-constructed classes are included in the build
  safelist: [
    'bg-solar-flare',
    'bg-solar-warm',
    'bg-ember-alert',
    'bg-cloud-dancer',
    'bg-vitality-mint',
    'bg-grove-green',
    'bg-grove-green-light',
    'border-solar-flare',
    'border-ember-alert',
    'text-solar-flare',
    'text-solar-warm',
    'text-ember-alert',
    'text-cloud-dancer',
    'text-grove-green',
    'text-grove-green-dark',
    // Gradient colors
    'from-morning-peach',
    'to-morning-gold',
    'from-midday-amber',
    'to-midday-white',
    'from-evening-indigo',
    'to-evening-copper',
    'from-night-grey',
    'to-night-dark',
    'bg-gradient-to-br',
  ],
  theme: {
    extend: {
      colors: {
        // Solar Vitality Light Mode Palette
        'light-bg': '#F0EDE9',         // Cloud Dancer - warm off-white background
        'light-surface': '#FAFAF7',    // Light card surfaces
        'solar-flare': '#FFB347',      // Solar Flare - primary accent
        'solar-warm': '#FF9F1C',       // Active/warm accent state
        'ember-alert': '#E86F1B',      // Warning/danger (unchanged)
        'vitality-mint': '#A8DADC',    // Wellness green for cofactors
        'cloud-dancer': '#F0EDE9',     // Alias for light-bg

        // Grove Green - Positive/Active Accent
        'grove-green': '#6B9E6B',      // Primary positive/active accent
        'grove-green-light': '#8FBF8F', // Light backgrounds, badges
        'grove-green-dark': '#4A7A4A',  // Text on light backgrounds

        // Glass/Frosted Effects (Light Mode)
        'glass-warm': 'rgba(255, 255, 255, 0.7)',
        'glass-border': 'rgba(0, 0, 0, 0.06)',

        // Text Colors (Light Mode)
        'text-primary': '#2D3436',     // Deep Slate - high legibility
        'text-secondary': '#545B64',   // Secondary text - WCAG AA compliant (~5:1 on light-bg)
        'text-muted': '#6B7075',       // Muted text - WCAG AA compliant (~4.5:1 on light-bg)

        // Gradients (Light Mode)
        'gradient-light-start': '#F0EDE9',
        'gradient-light-mid': '#F7F5F2',
        'gradient-warm': '#FFF8F0',    // Warm light gradient

        // Legacy/Backwards compatibility (now aliased to new values)
        'dark-bg': '#F0EDE9',          // Now maps to light-bg
        'dark-surface': '#FAFAF7',     // Now maps to light-surface
        'golden-glow': '#FFB347',      // Now maps to solar-flare
        'amber-glow': '#FF9F1C',       // Now maps to solar-warm
        'ember-glow': '#E86F1B',       // Now maps to ember-alert
        'solar-amber': '#FFB347',      // Now maps to solar-flare
        'deep-charcoal': '#2D3436',    // Now maps to text-primary
        'cloud-white': '#F0EDE9',      // Now maps to light-bg
        'border-light': '#E5E5E5',     // Light border
      },
    },
  },
  daisyui: {
    styled: true,
    base: true,
    utils: true,
    themes: [
      {
        mytheme: {
          primary: '#FFB347',        // solar-flare
          secondary: '#E86F1B',      // ember-alert
          accent: '#FF9F1C',         // solar-warm
          neutral: '#2D3436',        // text-primary (Deep Slate)
          'base-100': '#F0EDE9',     // light-bg (Cloud Dancer)
          'base-200': '#F7F5F2',     // gradient-light-mid
          'base-300': '#E5E5E5',     // border-light
          info: '#FFB347',
          success: '#6B9E6B',        // grove-green
          warning: '#E86F1B',        // ember-alert
          error: '#C96B6B',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};

export default config;

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
    'bg-solar-amber',
    'bg-deep-charcoal',
    'bg-ember-glow',
    'bg-cloud-white',
    'border-solar-amber',
    'border-ember-glow',
    'text-solar-amber',
    'text-ember-glow',
    'text-deep-charcoal',
    'text-cloud-white',
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
        // Bask Dark Mode Palette (Primary)
        'dark-bg': '#0A0E1A',          // Deep navy/charcoal background
        'dark-surface': '#1A1F2E',     // Card/surface background
        'golden-glow': '#D4A574',      // Golden ring color
        'amber-glow': '#E8A959',       // Bright amber for active ring
        'ember-glow': '#E86F1B',       // Orange/red for warnings

        // Glass/Frosted Effects
        'glass-white': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',

        // Text Colors (Dark Mode)
        'text-primary': '#FFFFFF',     // White text
        'text-secondary': '#A0A0A0',   // Muted text
        'text-muted': '#666666',       // Very muted text

        // Gradients
        'gradient-dark-start': '#0A0E1A',
        'gradient-dark-mid': '#1A1F2E',
        'gradient-warm': '#2D2416',    // Warm dark gradient

        // Legacy support
        'solar-amber': '#FFBF5E',
        'deep-charcoal': '#1A1A1A',
        'cloud-white': '#F9F9F9',
        'border-light': '#E5E5E5',
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
          primary: '#FFBF5E',        // solar-amber
          secondary: '#E86F1B',      // ember-glow
          accent: '#FFD078',         // midday-amber
          neutral: '#1A1A1A',        // deep-charcoal
          'base-100': '#F9F9F9',     // cloud-white
          'base-200': '#FAFAFA',     // midday-white
          'base-300': '#E5E5E5',     // border-light
          info: '#FFD078',
          success: '#8BA889',        // Keep for compatibility
          warning: '#E86F1B',        // ember-glow
          error: '#C96B6B',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};

export default config;

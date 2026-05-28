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
    'bg-bask-teal',
    'bg-bask-pink',
    'bg-bask-brown',
    'text-bask-teal',
    'text-bask-brown',
    'border-bask-teal',
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
        // Bask Sunny Palette — warm, playful, fun
        'light-bg': '#FBF6EB',         // Warm cream background
        'light-surface': '#FAFAF7',    // Light card surfaces
        'solar-flare': '#FFC93C',      // Primary brand yellow
        'solar-warm': '#F4A536',       // Deeper amber accent
        'ember-alert': '#E97B4F',      // Softer burn-risk warning
        'vitality-mint': '#A8DADC',    // Wellness green for cofactors
        'cloud-dancer': '#FBF6EB',     // Alias for light-bg
        'coral-accent': '#FF8A66',     // Coral accent (used sparingly)

        // New accent colors for variety/contrast
        'bask-teal': '#1AA1A2',        // Secondary accent — charts, nav, info
        'bask-teal-light': '#1AA1A233', // 20% teal for backgrounds
        'bask-pink': '#F8A3A1',        // Sunburn/risk indicators (decorative only)
        'bask-pink-light': '#F8A3A120', // 12% pink for backgrounds
        'bask-brown': '#572A19',       // Rich dark brown — depth, selected states
        'bask-brown-light': '#572A1920', // 12% brown for backgrounds

        // Grove Green - Positive/Active Accent
        'grove-green': '#5BB47A',      // Brighter positive/active accent
        'grove-green-light': '#7DC89A', // Light backgrounds, badges
        'grove-green-dark': '#3F8C58',  // Text on light backgrounds

        // Glass/Frosted Effects
        'glass-warm': 'rgba(255, 255, 255, 0.78)',
        'glass-border': 'rgba(0, 0, 0, 0.06)',

        // Text Colors — warm brown-tinted
        'text-primary': '#2A2419',     // Warm dark ink
        'text-secondary': '#7A6E58',   // Warm muted secondary
        'text-muted': '#7A6E58',       // Warm muted captions

        // Gradients
        'gradient-light-start': '#FBF6EB',
        'gradient-light-mid': '#F7F5F2',
        'gradient-warm': '#FFF8F0',    // Warm light gradient

        // Legacy/Backwards compatibility (aliased to new values)
        'dark-bg': '#FBF6EB',          // Now maps to light-bg
        'dark-surface': '#FAFAF7',     // Now maps to light-surface
        'golden-glow': '#FFC93C',      // Now maps to solar-flare
        'amber-glow': '#F4A536',       // Now maps to solar-warm
        'ember-glow': '#E97B4F',       // Now maps to ember-alert
        'solar-amber': '#FFC93C',      // Now maps to solar-flare
        'deep-charcoal': '#2A2419',    // Now maps to text-primary
        'cloud-white': '#FBF6EB',      // Now maps to light-bg
        'border-light': '#E5E0D4',     // Warmer light border
      },
      borderRadius: {
        'card': '28px',
        'sheet': '32px',
        'tab': '32px',
        'tile': '12px',
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
          primary: '#FFC93C',        // solar-flare (bright yellow)
          secondary: '#E97B4F',      // ember-alert (softer warning)
          accent: '#F4A536',         // solar-warm (amber)
          neutral: '#2A2419',        // text-primary (warm dark)
          'base-100': '#FBF6EB',     // light-bg (warm cream)
          'base-200': '#F7F5F2',     // gradient-light-mid
          'base-300': '#E5E0D4',     // border-light (warmer)
          info: '#1AA1A2',
          success: '#5BB47A',        // grove-green (brighter)
          warning: '#E97B4F',        // ember-alert
          error: '#C96B6B',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};

export default config;

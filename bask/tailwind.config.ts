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
    'bg-olive',
    'bg-sage',
    'bg-clay',
    'bg-teal',
    'bg-amber',
    'bg-dusty-rose',
    'bg-slate',
    'border-border-warm',
    'border-olive/50',
    'border-sage/50',
    'border-clay/50',
    'border-teal/50',
    'border-amber/50',
    'border-dusty-rose/50',
    'border-slate/50',
    // Cue pill styling
    'bg-amber/20',
    'bg-olive/20',
    'text-amber',
    // Daily Essential badge
    'bg-gold/15',
    'text-gold',
    'border-gold/30',
    // Heatmap colors
    'bg-heatmap-empty',
    'bg-heatmap-low',
    'bg-heatmap-medium',
    'bg-heatmap-high',
    // Premium card gradient
    'from-premium-cream',
    'to-amber/20',
    'bg-gradient-to-br',
  ],
  theme: {
    extend: {
      colors: {
        // Modern iOS muted earth tone palette
        limestone: '#F9F9F7',      // Softer off-white background
        oat: '#FFFFFF',            // Pure white cards
        sage: '#8BA889',           // Muted sage green
        clay: '#B57B65',           // Softer dusty rose/clay
        olive: '#5A7A52',          // Adjusted olive
        teal: '#6A9A9A',           // Softer teal
        amber: '#C4956A',          // Softer amber
        gold: '#B8962E',           // Muted gold/yellow for Daily Essential badge
        'dusty-rose': '#A8857D',   // Muted rose
        slate: '#7A8A9A',          // Softer slate
        umber: '#3D3835',          // Dark brown text
        'umber-muted': '#7A726C',  // Muted text
        'border-warm': '#E5E2DC',  // Softer border
        'premium-cream': '#F5EDE5', // Softer cream
        'hero-cream': '#F5F2ED',   // Hero card background
        // Heatmap colors (GitHub-style with earth tones)
        'heatmap-empty': '#F2F0EB',    // Warm Limestone
        'heatmap-low': '#C5D4B8',      // Pale Sage
        'heatmap-medium': '#5E7B4C',   // Mossy Olive
        'heatmap-high': '#3A5534',     // Deep Forest Green
        // XP progress bar
        'canyon-clay': '#C36A4A',      // Canyon Clay for XP bar
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
          primary: '#5A7A52',
          secondary: '#B57B65',
          accent: '#8BA889',
          neutral: '#3D3835',
          'base-100': '#F9F9F7',
          'base-200': '#FFFFFF',
          'base-300': '#E5E2DC',
          info: '#6A9A9A',
          success: '#8BA889',
          warning: '#B57B65',
          error: '#C96B6B',
        },
      },
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};

export default config;

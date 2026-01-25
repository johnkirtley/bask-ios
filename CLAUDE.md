# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an iOS app template built with Next.js 13 and wrapped as a native iOS/Android app using Capacitor. It provides a foundation for building hybrid mobile apps with built-in support for monetization, onboarding, and settings.

## Quick Start

1. **Customize the app identity:**
   - Update `app-name/capacitor.config.ts` - change `appId` and `appName`
   - Update `app-name/ios/App/App/Info.plist` - change `CFBundleDisplayName` and `GADApplicationIdentifier`
   - Update `app-name/package.json` - change `name`

2. **Add your API keys:**
   - Copy `.env.example` to `.env`
   - Add your RevenueCat and AdMob API keys

3. **Customize the UI:**
   - Update `app-name/app/page.tsx` - main home page
   - Update `app-name/lib/onboardingData.ts` - onboarding questions
   - Update `app-name/lib/constants.ts` - app-specific constants

## Build & Development Commands

```bash
# Install dependencies
cd app-name
npm install

# Development server
npm run dev

# Production build (static export)
npm run build

# Sync web assets to native projects
npx cap sync

# Open iOS project in Xcode
npx cap open ios

# Open Android project in Android Studio
npx cap open android
```

### iOS-Specific Commands

```bash
cd app-name/ios/App
pod install          # Install CocoaPods dependencies
```

## Architecture

### Hybrid Mobile Stack

- **Web Layer**: Next.js 13 with static export (`output: 'export'`)
- **Native Bridge**: Capacitor 6.x wraps the exported static site
- **UI Framework**: Ionic React + Tailwind CSS + DaisyUI

### Key Directories

```
app-name/
├── app/                  # Next.js App Router
│   ├── page.tsx         # Home page
│   ├── settings/        # Settings page
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── navigation/      # TabBar, SettingsButton
│   ├── onboarding/      # Onboarding flow components
│   └── ui/             # Generic UI components
├── hooks/              # React hooks
│   ├── useSubscription.ts    # RevenueCat integration
│   ├── useInterstitialAd.ts  # AdMob integration
│   ├── useHappinessFilter.ts # App review prompts
│   └── useOnboarding.ts      # Onboarding state
├── contexts/           # React contexts
├── lib/               # Utilities and constants
├── ios/App/          # Xcode project
├── android/          # Android project
└── out/              # Built static site (generated)
```

## Features Included

### Monetization (Ready to Use)

- **RevenueCat** - In-app purchases and subscriptions
  - Configure in `hooks/useSubscription.ts`
  - Add your API key to `.env`

- **AdMob** - Banner and interstitial ads
  - Configure in `hooks/useInterstitialAd.ts`
  - Add your app IDs to `.env` and `ios/App/App/Info.plist`

### Onboarding Flow

- Welcome screen
- Customizable questions
- Legal terms acceptance
- Stored in local SQLite (native) or localStorage (web)

### Settings Page

- Subscription management
- Restore purchases
- Support links (feature requests, issue reporting, app rating)
- Privacy policy and terms of service links
- Onboarding reset

### Database

- SQLite via `@capacitor-community/sqlite`
- Automatic migrations
- Fallback to localStorage on web

## iOS Design Guidelines

This template follows **Apple's Human Interface Guidelines**:

- Bottom tab navigation (not hamburger menus)
- Haptic feedback on interactions
- Native iOS components via Ionic React
- Respect for safe areas and notch
- Dark mode support via Tailwind

### Native-First Development Strategy

**CRITICAL:** Always prioritize native iOS components and behaviors.

#### Component Choice Hierarchy

1. **Native iOS via Capacitor plugins** (HIGHEST PRIORITY)
2. **Ionic React Components** (SECOND PRIORITY)
3. **Tailwind/DaisyUI with iOS styling** (THIRD PRIORITY)
4. **Custom Web Components** (LAST RESORT)

### Capacitor Plugins Available

- `@capacitor/haptics` - Tactile feedback
- `@capacitor/browser` - In-app browser
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/keyboard` - Keyboard events
- `@capacitor/app` - App state and lifecycle

### Ionic React Components

The project has `@ionic/react` installed. Use these components:

- `IonModal` - Sheet modals with snap points
- `IonAlert` - Native-style alerts
- `IonToast` - Native-style toasts
- `IonActionSheet` - Action menus
- `IonToggle` - Native iOS toggles

**Reference:** [Ionic React Components Documentation](https://ionicframework.com/docs/components)

## Customization Guide

### 1. Change App Name & Bundle ID

**capacitor.config.ts:**
```typescript
appId: 'com.yourcompany.yourapp',
appName: 'Your App Name',
```

**ios/App/App/Info.plist:**
```xml
<key>CFBundleDisplayName</key>
<string>YourApp</string>
```

### 2. Update Onboarding Questions

Edit `lib/onboardingData.ts`:

```typescript
export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 'interest',
    title: 'What brings you here today?',
    options: [
      { value: 'option1', label: 'Your Option 1' },
      { value: 'option2', label: 'Your Option 2' },
    ],
  },
];
```

Update types in `types/index.ts` if adding new questions.

### 3. Customize Colors

Edit `tailwind.config.ts` to change the color palette:

```typescript
colors: {
  limestone: '#F9F9F7',  // Background
  oat: '#F2F0EA',        // Secondary background
  umber: '#3D3D3D',      // Primary text
  sage: '#8FA998',       // Primary accent
  // ... add your colors
}
```

### 4. Add Your Content

Replace the placeholder home page in `app/page.tsx` with your app's main functionality.

### 5. Configure Monetization

**RevenueCat:**
1. Sign up at [revenuecat.com](https://www.revenuecat.com)
2. Add your API key to `.env`
3. Configure products in RevenueCat dashboard

**AdMob:**
1. Create app at [admob.google.com](https://admob.google.com)
2. Get your App ID and Ad Unit IDs
3. Update `.env` and `ios/App/App/Info.plist`

## Building for Production

1. Update app version in `package.json`
2. Run `npm run build`
3. Run `npx cap sync ios`
4. Open Xcode: `npx cap open ios`
5. Archive and upload to App Store

## Common Patterns

### Adding a New Page

1. Create `app/your-page/page.tsx`
2. Add route to `lib/constants.ts` (ROUTES)
3. Update TabBar if needed (`components/navigation/TabBar.tsx`)

### Using Subscriptions

```typescript
const { isPremium, canAccess, presentPaywall } = useSubscription();

if (!canAccess('premium')) {
  presentPaywall();
  return;
}
```

### Showing Interstitial Ads

```typescript
const { showInterstitial } = useInterstitialAd();

// Show ad after completing an action
await showInterstitial();
```

### Triggering Haptic Feedback

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

await Haptics.impact({ style: ImpactStyle.Light });
```

## Notes

- The app uses static export - all pages must be pre-rendered
- Capacitor bridges web and native via JavaScript
- SQLite is used for native storage, localStorage for web
- Always test on a real device, not just the simulator

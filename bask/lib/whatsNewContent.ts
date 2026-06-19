/**
 * Curated "What's New" content, keyed by the iOS marketing version
 * (`CFBundleShortVersionString`, i.e. `App.getInfo().version` — e.g. "6.0").
 *
 * After shipping a meaningful update, add an entry here for the version you are
 * releasing. On the first launch of that build, existing users who updated will
 * see a one-time full-screen sheet describing the changes. Versions without an
 * entry simply show nothing.
 *
 * Keep this file pure data (no React) so it is trivial to update each release.
 */

export interface WhatsNewItem {
  /** A single emoji used as the row's icon. */
  icon: string;
  title: string;
  description: string;
}

export interface WhatsNewContent {
  /** Optional override for the sheet headline. Defaults to "What's New". */
  headline?: string;
  items: WhatsNewItem[];
}

export interface WhatsNewEntry extends WhatsNewContent {
  /** Matches `App.getInfo().version` — sourced from the WHATS_NEW key. */
  version: string;
}

/** Keyed by the iOS marketing version (`App.getInfo().version`, e.g. "6.0"). */
export const WHATS_NEW: Record<string, WhatsNewContent> = {
  // Example seed for the next release. Update the items (and add new version
  // keys) whenever you ship a meaningful update.
  '6.0': {
    headline: "What's New in Bask",
    items: [
      {
        icon: '🧪',
        title: 'Track your vitamin D labs',
        description:
          'Log your 25(OH)D blood test results and watch your levels trend over time.',
      },
      {
        icon: '☀️',
        title: 'Sharper synthesis windows',
        description:
          'Your daily D-window forecast is more accurate, so you know exactly when to get out.',
      },
      {
        icon: '✨',
        title: 'Polish & fixes',
        description:
          'Smoother insights, cleaner stats, and a handful of bug fixes throughout the app.',
      },
    ],
  },
};

/** Returns the curated entry for a version, or null when none exists. */
export function getWhatsNewEntry(version: string): WhatsNewEntry | null {
  const content = WHATS_NEW[version];
  return content ? { version, ...content } : null;
}

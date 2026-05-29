export interface ReflectionContent {
  label?: string;
  headline?: string;
  body: string;
  source: string;
}

export const SKIN_REFLECTIONS: Record<string, ReflectionContent> = {
  'very-fair': {
    label: 'Based on your skin type',
    body: 'Type I skin may synthesize vitamin D faster than other skin types, but burn risk can climb quickly.\n\nBask uses this to help estimate shorter, lower-risk sessions.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts (Holick-derived); Fitzpatrick (Arch Dermatol 1988).',
  },
  fair: {
    label: 'Based on your skin type',
    body: 'Type II skin may make vitamin D efficiently, with moderate burn risk.\n\nBask estimates session length around your potential sunburn threshold.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts (Holick-derived); Fitzpatrick (Arch Dermatol 1988).',
  },
  medium: {
    label: 'Based on your skin type',
    body: 'Type III skin may need about 1.6× the sun of the fairest skin types to make similar vitamin D.\n\nBask factors that into your plan as one input.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts (Holick-derived); Fitzpatrick (Arch Dermatol 1988).',
  },
  olive: {
    label: 'Based on your skin type',
    body: 'Type IV skin may need roughly 2.5× the sun of the fairest skin types to produce similar vitamin D.\n\nBask uses this to help scale your starting plan.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts (Holick-derived); Fitzpatrick (Arch Dermatol 1988).',
  },
  brown: {
    label: 'Based on your skin type',
    body: 'Type V skin can need ~4× the sun of fair skin to make similar vitamin D.\n\nHigher melanin may help reduce burning, but longer sessions can matter more.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts (Holick-derived); Fitzpatrick (Arch Dermatol 1988).',
  },
  'dark-brown': {
    label: 'Based on your skin type',
    body: 'Type VI skin may need roughly 3 to 5 times more sun exposure than fair skin to make similar vitamin D, and deficiency rates tend to be higher in this group.\n\nBask uses this to help calibrate your starting plan.',
    source:
      'SKIN_MULTIPLIERS in dEngine.ts; Frontiers in Nutrition 2022, NHANES 2001-2018 (11.9% severe + 48.5% moderate deficiency in non-Hispanic Black adults).',
  },
};

export const OUTDOOR_REFLECTIONS: Record<string, ReflectionContent> = {
  'under-15': {
    headline: 'Less outdoor time can mean higher risk.',
    body: 'In NHANES data, indoor workers have ~78% vitamin D deficiency vs ~48% for outdoor workers.\n\nLess than 15 minutes outdoors a day is associated with lower vitamin D levels in many adults.',
    source:
      'Sowah et al., BMC Public Health 2017 (78% indoor vs 48% outdoor worker deficiency).',
  },
  '15-60': {
    headline: "You're not alone.",
    body: 'About 70% of US adults have vitamin D below commonly cited optimal ranges, and shorter outdoor time is one of the strongest predictors.\n\nBask uses this as one input when building your plan.',
    source:
      'Liu et al., NHANES 2001-2010 (Br J Nutr 2018): 28.9% deficient + 41.4% insufficient ≈ 70.3% by Endocrine Society thresholds.',
  },
  '1-3-hours': {
    headline: 'Above average.',
    body: "Most US adults don't get this much sun.\n\nBut timing and skin exposure may matter more than total time. Bask aims to help you make the minutes count.",
    source:
      'Holick (JBMR 2007): UVB <20% of midday strength before 10am or after 4pm; timing dominates dose.',
  },
  '3-plus': {
    headline: 'Plenty of sun exposure.',
    body: "Plenty of sun, but more isn't always more. UVB can plateau quickly, and excess exposure may trade vitamin D for sunburn risk.\n\nBask aims to keep you near the more productive window while staying below your potential burn zone.",
    source:
      'Holick Science 1981: previtamin D₃ plateaus at ~10-15% of skin 7-DHC; further exposure converts to inert isomers.',
  },
};

export const SUNSCREEN_REFLECTIONS: Record<string, ReflectionContent> = {
  never: {
    label: 'Based on your SPF routine',
    body: "No sunscreen means your skin may get the full UVB dose for vitamin D, and the full burn risk.\n\nBask flags potential windows below your skin's estimated burn threshold.",
    source:
      'Faurschou et al., Br J Dermatol 2012; Petersen et al., Br J Dermatol 2014.',
  },
  'beach-only': {
    label: 'Based on your SPF routine',
    body: 'Much of your daily incidental UV may be unfiltered, which can help vitamin D as long as you stay below your potential burn threshold.\n\nBask can suggest short windows to consider.',
    source:
      'Neale et al., PLoS ONE 2019: real-world application at ~0.5-1 mg/cm² lets meaningful UVB through.',
  },
  'when-i-remember': {
    label: 'Based on your SPF routine',
    body: 'Inconsistent SPF can mean inconsistent vitamin D synthesis.\n\nBask may suggest when a sunscreen-free window looks short enough to reduce burn risk and long enough to count.',
    source:
      'Neale et al., PLoS ONE 2019; Faurschou et al., Br J Dermatol 2012.',
  },
  'daily-spf': {
    label: 'Based on your SPF routine',
    body: 'SPF 30 applied at the labeled thickness can reduce vitamin-D-producing UVB by ~95%.\n\nBask can help you find a brief, intentional sunscreen-free window, a lower-dose approach designed to reduce burn risk.',
    source:
      'Faurschou et al., Br J Dermatol 2012 (~95% for SPF 8); Petersen et al., Br J Dermatol 2014.',
  },
};

export function getSkinReflection(
  skinTone: string | null,
): ReflectionContent | null {
  if (!skinTone) return null;
  return SKIN_REFLECTIONS[skinTone] ?? null;
}

export function getOutdoorReflection(
  outdoorTime: string | null,
): ReflectionContent | null {
  if (!outdoorTime) return null;
  return OUTDOOR_REFLECTIONS[outdoorTime] ?? null;
}

export function getSunscreenReflection(
  sunscreenFrequency: string | null,
): ReflectionContent | null {
  if (!sunscreenFrequency) return null;
  return SUNSCREEN_REFLECTIONS[sunscreenFrequency] ?? null;
}

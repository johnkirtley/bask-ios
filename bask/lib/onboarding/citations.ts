export interface Citation {
  claim: string;
  source: string;
}

// Research citations woven through onboarding to build trust.
// Claims and sources are copied verbatim from the design handoff and should be
// re-verified against current publications before shipping.
export const CITATIONS: Record<string, Citation> = {
  genes: {
    claim: 'Sunlight influences over 1,000 genes and supports mood, immunity, and heart health.',
    source: 'Environmental Health Perspectives · NIH',
  },
  midday: {
    claim: 'Just 10 to 15 minutes of midday sun on arms and legs, a few times a week, can support healthy vitamin D levels.',
    source: 'Harvard Health Publishing',
  },
  deficient: {
    claim: 'About 1 in 4 Americans is vitamin D deficient, and far more fall below optimal levels.',
    source: 'NHANES · U.S. national survey data',
  },
  winter: {
    claim: 'In northern cities, your skin makes little to no vitamin D from the sun from November to February.',
    source: 'Harvard Health Publishing',
  },
  aging: {
    claim: 'Vitamin D is linked to slower biological aging, about 3 fewer years over a 4-year span.',
    source: 'Harvard Medical School · Am. J. Clinical Nutrition, 2025',
  },
  vital: {
    claim: 'In a Harvard trial, vitamin D was tied to fewer autoimmune conditions and lower inflammation.',
    source: 'Harvard Medical School · VITAL Trial, 2025',
  },
};

export type CitationId = keyof typeof CITATIONS;

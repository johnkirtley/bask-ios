export interface CountryOption {
  code: string;
  name: string;
}

/** Common countries for optional leaderboard location display */
export const LEADERBOARD_COUNTRIES: CountryOption[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
];

export type LocationPrecision = 'none' | 'country' | 'region' | 'city';

export function formatLocationLabel(
  countryCode: string | null | undefined,
  regionLabel: string | null | undefined,
  cityLabel: string | null | undefined,
  precision: LocationPrecision,
): string | null {
  if (precision === 'none') return null;

  const country = LEADERBOARD_COUNTRIES.find((c) => c.code === countryCode);
  const countryName = country?.name ?? countryCode ?? null;

  if (precision === 'city' && cityLabel && regionLabel) {
    return `${cityLabel}, ${regionLabel}`;
  }
  if (precision === 'region' && regionLabel && countryName) {
    return `${regionLabel}, ${countryName}`;
  }
  if (precision === 'country' && countryName) {
    return countryName;
  }
  return countryName;
}

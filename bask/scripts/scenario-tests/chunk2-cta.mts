import { getBaskCta, ctaVariantToPhase, type TimeOfDayPhase } from '../../lib/lightPhase';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, got?: unknown) {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}` + (cond ? '' : `  <<< got ${JSON.stringify(got)}`));
}

type Case = {
  name: string; rawUV: number; effectiveUV: number; timeOfDay: TimeOfDayPhase; cd: number | null;
  variant: string; label: string; helperIncludes: string;
};
const cases: Case[] = [
  { name: 'vitamin D (eff>=3)', rawUV: 6, effectiveUV: 5, timeOfDay: 'midday', cd: null,
    variant: 'vitaminD', label: 'Bask Now', helperIncludes: 'Tap to start' },
  { name: 'morning pre-synthesis w/ countdown', rawUV: 1, effectiveUV: 1, timeOfDay: 'morning', cd: 38,
    variant: 'morningLight', label: 'Get morning light', helperIncludes: 'vitamin D starts in 38 min' },
  { name: 'morning clear, no countdown', rawUV: 2, effectiveUV: 2, timeOfDay: 'morning', cd: null,
    variant: 'morningLight', label: 'Get morning light', helperIncludes: 'circadian rhythm' },
  { name: 'morning clouds blocking (raw>=3)', rawUV: 5, effectiveUV: 2, timeOfDay: 'morning', cd: null,
    variant: 'morningLight', label: 'Get morning light', helperIncludes: 'Clouds are blocking' },
  { name: 'afternoon low-uv clear, no synthesis', rawUV: 2, effectiveUV: 2, timeOfDay: 'midday', cd: null,
    variant: 'lowUv', label: 'Get some light', helperIncludes: "isn't strong enough for vitamin D right now" },
  { name: 'afternoon clouds blocking', rawUV: 6, effectiveUV: 2, timeOfDay: 'evening', cd: null,
    variant: 'lowUv', label: 'Get some light', helperIncludes: 'Clouds are blocking vitamin D right now' },
  { name: 'late-clearing afternoon w/ countdown (honest label)', rawUV: 2, effectiveUV: 2, timeOfDay: 'midday', cd: 45,
    variant: 'morningLight', label: 'Get some light', helperIncludes: 'Light now · vitamin D starts in 45 min' },
  { name: 'night (eff 0)', rawUV: 0, effectiveUV: 0, timeOfDay: 'night', cd: null,
    variant: 'night', label: 'Bask Now', helperIncludes: 'Tap to start' },
];

for (const c of cases) {
  const cta = getBaskCta({ rawUV: c.rawUV, effectiveUV: c.effectiveUV, timeOfDay: c.timeOfDay, synthesisCountdownMin: c.cd });
  const ok = cta.variant === c.variant && cta.label === c.label && cta.helper.includes(c.helperIncludes);
  check(c.name, ok, cta);
}

// phase mapping
check('ctaVariantToPhase morningLight', ctaVariantToPhase('morningLight') === 'morning_light');
check('ctaVariantToPhase lowUv', ctaVariantToPhase('lowUv') === 'low_uv');
check('ctaVariantToPhase vitaminD', ctaVariantToPhase('vitaminD') === 'vitamin_d');
check('ctaVariantToPhase night -> vitamin_d', ctaVariantToPhase('night') === 'vitamin_d');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

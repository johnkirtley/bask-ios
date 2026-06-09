import { effectiveUv } from '../../lib/dEngine';

// Mirrors the ActiveSessionView "UV Now" stat derivation to lock the scenarios.
function uvStat(uvIndex: number, cloudCover?: number) {
  const liveEffectiveUv = effectiveUv(uvIndex, cloudCover);
  const isCloudBlockingVitaminD = uvIndex >= 3 && liveEffectiveUv < 3;
  const cloudsDimmingUv =
    cloudCover !== undefined && cloudCover >= 0.2 && uvIndex - liveEffectiveUv >= 0.3;
  const display = liveEffectiveUv.toFixed(1);
  const subtext = isCloudBlockingVitaminD
    ? 'Vitamin D blocked by clouds'
    : cloudsDimmingUv
    ? `Raw UV ${uvIndex.toFixed(1)} · clouds dimming`
    : null;
  return { display, subtext };
}

const scenarios: [string, number, number | undefined, string, string | null][] = [
  ['clear high UV (web mock, no cloud)', 8, undefined, '8.0', null],
  ['clear-ish 10% cloud high UV', 8, 0.1, '7.4', null],
  ['partly cloudy 30% reducing', 8, 0.3, '6.3', 'Raw UV 8.0 · clouds dimming'],
  ['heavy cloud blocking (raw 5)', 5, 0.7, '2.5', 'Vitamin D blocked by clouds'],
  ['low morning sun, clear', 2, 0.1, '1.9', null],
  ['night', 0, 0.1, '0.0', null],
];

let pass = 0, fail = 0;
for (const [name, uv, cloud, expDisp, expSub] of scenarios) {
  const { display, subtext } = uvStat(uv, cloud);
  const ok = display === expDisp && subtext === expSub;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} -> "${display}" / ${JSON.stringify(subtext)}` + (ok ? '' : ` (expected "${expDisp}" / ${JSON.stringify(expSub)})`));
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

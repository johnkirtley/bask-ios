import { integrateAccrual, type AccrualInput, type AccrualResult } from '../../lib/sessionAccrual';
import { vitaminDRatePerMinute } from '../../lib/dEngine';

type FitzpatrickType = 1 | 2 | 3 | 4 | 5 | 6;

// A tiny session simulator that drives the REAL integrator the same way the hook does.
class Sim {
  startMs = 0;
  nowMs = 0;
  state: AccrualResult & { exposurePercent: number; fitzpatrickType: FitzpatrickType; age: number | null; startTime: Date };
  constructor(opts: { exposurePercent?: number; fitz?: FitzpatrickType; age?: number | null; startUv: number }) {
    const exposurePercent = opts.exposurePercent ?? 60;
    const fitzpatrickType = opts.fitz ?? 2;
    const age = opts.age ?? 30;
    const startsSynth = vitaminDRatePerMinute(opts.startUv, exposurePercent, fitzpatrickType, age) > 0;
    this.state = {
      exposurePercent, fitzpatrickType, age,
      startTime: new Date(0),
      elapsedSeconds: 0, accumulatedIU: 0, currentIU: 0,
      lastAccrualMs: 0, lastAccrualEffUv: opts.startUv,
      synthesizing: startsSynth, hasSynthesized: startsSynth,
    };
  }
  // advance `seconds` at constant effective UV, ticking every second like the timer
  run(seconds: number, effUv: number) {
    for (let i = 0; i < seconds; i++) {
      this.nowMs += 1000;
      this.tick(effUv);
    }
  }
  // simulate a backgrounded gap: no ticks for `minutes`, then one foreground reconcile
  background(minutes: number, effUvOnReturn: number) {
    this.nowMs += minutes * 60000;
    this.tick(effUvOnReturn);
  }
  pauseResume(pausedMinutes: number) {
    // during pause: no ticks; on resume the hook resets lastAccrualMs to now
    this.nowMs += pausedMinutes * 60000;
    this.state.lastAccrualMs = this.nowMs;
    this.state.lastAccrualEffUv = this.state.lastAccrualEffUv;
  }
  private tick(effUv: number) {
    const input: AccrualInput = {
      startTime: this.state.startTime,
      exposurePercent: this.state.exposurePercent,
      fitzpatrickType: this.state.fitzpatrickType,
      age: this.state.age,
      accumulatedIU: this.state.accumulatedIU,
      lastAccrualMs: this.state.lastAccrualMs,
      lastAccrualEffUv: this.state.lastAccrualEffUv,
      hasSynthesized: this.state.hasSynthesized,
    };
    const next = integrateAccrual(input, effUv, this.nowMs);
    if (next) Object.assign(this.state, next);
  }
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = '') {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${cond ? '' : '  <<< ' + detail}`);
}

// 1. Pure morning light: 30 min at effective UV 2 -> IU stays exactly 0, never synthesizes
{
  const s = new Sim({ startUv: 2 });
  s.run(30 * 60, 2);
  check('morning light 30m @UV2 -> IU 0', s.state.currentIU === 0, `got ${s.state.currentIU}`);
  check('morning light -> not synthesizing', s.state.synthesizing === false);
  check('morning light -> hasSynthesized false', s.state.hasSynthesized === false);
}

// 2. No back-credit: 30 min @UV2 then 10 min @UV4 -> IU equals ONLY the 10 min @UV4
{
  const s = new Sim({ startUv: 2 });
  s.run(30 * 60, 2);
  const iuAtCross = s.state.currentIU;
  s.run(10 * 60, 4);
  const expected10 = vitaminDRatePerMinute(4, 60, 2, 30) * 10; // 10 min @ UV4
  check('no back-credit: IU at crossing is 0', iuAtCross === 0);
  check('no back-credit: only 10m@UV4 counted',
    Math.abs(s.state.accumulatedIU - expected10) < 1e-6,
    `got ${s.state.accumulatedIU}, expected ${expected10}`);
  check('crossing flips synthesizing true', s.state.synthesizing === true);
  check('crossing sets hasSynthesized (morph latch)', s.state.hasSynthesized === true);
}

// 3. Monotonic across a UV dip: UV4 10m -> UV2 10m (cloud) -> UV4 10m. Never decreases; holds during dip.
{
  const s = new Sim({ startUv: 4 });
  const ius: number[] = [];
  s.run(10 * 60, 4); ius.push(s.state.accumulatedIU);
  const beforeDip = s.state.accumulatedIU;
  s.run(10 * 60, 2); ius.push(s.state.accumulatedIU);
  const afterDip = s.state.accumulatedIU;
  s.run(10 * 60, 4); ius.push(s.state.accumulatedIU);
  check('dip: IU holds flat during cloud block', Math.abs(afterDip - beforeDip) < 1e-9, `before ${beforeDip} after ${afterDip}`);
  check('monotonic non-decreasing across dip', ius[0] <= ius[1] && ius[1] <= ius[2]);
  // total should equal 20 min @ UV4 (the dip contributes nothing)
  const expected20 = vitaminDRatePerMinute(4, 60, 2, 30) * 20;
  check('dip: total == 20m@UV4 (dip uncounted)', Math.abs(s.state.accumulatedIU - expected20) < 1e-6, `got ${s.state.accumulatedIU}`);
}

// 4. Pause does not credit paused time: 10m@UV4, pause 20m, 10m@UV4 == 20m@UV4
{
  const s = new Sim({ startUv: 4 });
  s.run(10 * 60, 4);
  s.pauseResume(20);
  s.run(10 * 60, 4);
  const expected20 = vitaminDRatePerMinute(4, 60, 2, 30) * 20;
  check('pause: 20m paused not credited', Math.abs(s.state.accumulatedIU - expected20) < 1e-6, `got ${s.state.accumulatedIU}`);
}

// 5. Started-in-D session never "morphs": hasSynthesized true from the first tick
{
  const s = new Sim({ startUv: 5 });
  check('start-in-D: hasSynthesized true at start', s.state.hasSynthesized === true);
  s.run(60, 5);
  check('start-in-D: still synthesizing, no false morning-light', s.state.synthesizing === true);
}

// 6. Backgrounded morph is NOT over-credited: sit @UV1, background 60m, return @UV5.
//    Conservative crediting uses min(startUv=1, nowUv=5)=1 -> rate 0 -> credits ~0, not 60m@UV5.
{
  const s = new Sim({ startUv: 1 });
  s.run(5, 1); // a few foreground ticks at UV1
  s.background(60, 5); // backgrounded an hour, UV climbed to 5 by return
  const naiveOvercredit = vitaminDRatePerMinute(5, 60, 2, 30) * 60;
  check('background morph: not over-credited at latest UV', s.state.accumulatedIU < naiveOvercredit * 0.05,
    `got ${s.state.accumulatedIU}, naive=${naiveOvercredit}`);
  check('background return @UV5 -> now synthesizing', s.state.synthesizing === true);
  // subsequent foreground minutes DO accrue normally
  const before = s.state.accumulatedIU;
  s.run(10 * 60, 5);
  check('after background return, foreground accrues again', s.state.accumulatedIU > before);
}

// 7. Sunset within a D session: accrual stops when UV falls below 3, IU holds (no negative)
{
  const s = new Sim({ startUv: 4 });
  s.run(10 * 60, 4);
  const banked = s.state.accumulatedIU;
  s.run(10 * 60, 1); // sun sets
  check('sunset: IU holds (no decrease)', s.state.accumulatedIU === banked, `banked ${banked} now ${s.state.accumulatedIU}`);
  check('sunset: not synthesizing', s.state.synthesizing === false);
  check('sunset: hasSynthesized stays true', s.state.hasSynthesized === true);
}

// 8. Parity with old model under constant UV below burn threshold (linear region)
{
  // 15 min @ UV5, exposure 60, fitz2, age 30. Old model = calculateVitaminD linear part.
  const s = new Sim({ startUv: 5 });
  s.run(15 * 60, 5);
  const expected = vitaminDRatePerMinute(5, 60, 2, 30) * 15;
  check('parity: integrator == rate*minutes in linear region', Math.abs(s.state.accumulatedIU - expected) < 1e-6,
    `got ${s.state.accumulatedIU} expected ${expected}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

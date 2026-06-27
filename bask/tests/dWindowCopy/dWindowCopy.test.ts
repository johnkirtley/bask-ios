import { describe, it, expect } from 'vitest';
import { getTodayNoWindowCopy } from '../../lib/dWindowCopy';

describe('getTodayNoWindowCopy — the BASKAPP-26 cloud-messaging fix', () => {
  describe('clouds-blocking: isCurrentCloudBlocked = true (clouds right now)', () => {
    const result = getTodayNoWindowCopy('clouds-blocking', false, true);
    it('headline is "No window right now"', () => {
      expect(result.headline).toBe('No window right now');
    });
    it('subtext says "right now" (not "later today")', () => {
      expect(result.subtext).toContain('right now');
      expect(result.subtext).not.toContain('later today');
    });
    it('subtext mentions clouds blocking', () => {
      expect(result.subtext).toContain('Clouds may be blocking');
    });
  });

  describe('clouds-blocking: isCurrentCloudBlocked = false (clouds later)', () => {
    const result = getTodayNoWindowCopy('clouds-blocking', false, false);
    it('headline is "No window right now"', () => {
      expect(result.headline).toBe('No window right now');
    });
    it('subtext says "later today" (not "right now")', () => {
      expect(result.subtext).toContain('later today');
      expect(result.subtext).not.toContain('right now');
    });
    it('subtext mentions clouds limiting', () => {
      expect(result.subtext).toContain('Clouds may limit');
    });
  });

  describe('clouds-blocking: the two subtexts must differ', () => {
    it('isCurrentCloudBlocked=true vs false produce different subtexts', () => {
      const now = getTodayNoWindowCopy('clouds-blocking', false, true);
      const later = getTodayNoWindowCopy('clouds-blocking', false, false);
      expect(now.subtext).not.toBe(later.subtext);
    });
  });
});

describe('getTodayNoWindowCopy — uv-too-low', () => {
  it('mentions UV being too low', () => {
    const result = getTodayNoWindowCopy('uv-too-low', false, false);
    expect(result.subtext).toContain('UV is too low');
  });

  it('does NOT mention clouds', () => {
    const result = getTodayNoWindowCopy('uv-too-low', false, false);
    expect(result.subtext).not.toContain('Cloud');
  });
});

describe('getTodayNoWindowCopy — low-exposure', () => {
  it('mentions conditions', () => {
    const result = getTodayNoWindowCopy('low-exposure', false, false);
    expect(result.subtext).toContain('Conditions');
  });

  it('does NOT mention clouds or UV', () => {
    const result = getTodayNoWindowCopy('low-exposure', false, false);
    expect(result.subtext).not.toContain('Cloud');
    expect(result.subtext).not.toContain('UV');
  });
});

describe('getTodayNoWindowCopy — after sunset override', () => {
  it('overrides clouds-blocking when after sunset', () => {
    const result = getTodayNoWindowCopy('clouds-blocking', true, true);
    expect(result.headline).toBe('Sun has set');
    expect(result.subtext).not.toContain('Cloud');
  });

  it('overrides uv-too-low when after sunset', () => {
    const result = getTodayNoWindowCopy('uv-too-low', true, false);
    expect(result.headline).toBe('Sun has set');
  });

  it('overrides low-exposure when after sunset', () => {
    const result = getTodayNoWindowCopy('low-exposure', true, false);
    expect(result.headline).toBe('Sun has set');
  });

  it('overrides undefined reason when after sunset', () => {
    const result = getTodayNoWindowCopy(undefined, true, false);
    expect(result.headline).toBe('Sun has set');
  });
});

describe('getTodayNoWindowCopy — undefined reason fallback', () => {
  it('shows forecast updating message', () => {
    const result = getTodayNoWindowCopy(undefined, false, false);
    expect(result.headline).toBe('No window right now');
    expect(result.subtext).toContain('Forecast still updating');
  });
});

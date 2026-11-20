import { describe, expect, it } from 'vitest';
import {
  calculate,
  displayedAmounts,
  elapsedHours,
  recommend,
  selectProtocol,
} from '../src/domain/starter';
import type { DecisionInput, Safety, StoragePlace } from '../src/domain/starter';
const input: DecisionInput = {
  storage: 'fridge',
  elapsedHours: 120,
  safety: 'healthy',
  goal: 'bake',
  activity: 'quiet',
  temperature: 24,
  hydration: 100,
};
describe('shared recommendation rules', () => {
  it('selects 1:2:2 for five fridge days, requiring observed growth', () => {
    const result = recommend(input);
    expect(result.kind).toBe('protocol');
    expect(result.protocol?.ratio).toBe(2);
    expect(result.nextCondition).toContain('repetible');
  });
  it('starts prolonged fridge recovery with the owner-agreed 1:2:2 strategy', () => {
    const result = recommend({ ...input, elapsedHours: 25 * 24 });
    expect(result.protocol?.ratio).toBe(2);
    expect(result.protocol?.steps.join(' ')).toContain('12–24');
  });
  it('starts 1:2:2 after 36 hours at room temperature', () =>
    expect(recommend({ ...input, storage: 'room', elapsedHours: 36 }).protocol?.ratio).toBe(2));
  it.each([3, 18])('uses 1:1:1 for healthy routine room feeding after %s hours', (hours) => {
    const result = recommend({ ...input, storage: 'room', elapsedHours: hours, activity: 'peak' });
    expect(result.protocol?.ratio).toBe(1);
    expect(result.protocol?.steps.join(' ')).toContain('1:1:1');
  });
  it.each([3, 18])('allows a longer 1:2:2 routine room feeding after %s hours', (hours) => {
    const result = recommend({
      ...input,
      storage: 'room',
      elapsedHours: hours,
      activity: 'peak',
      feedingPace: 'longer',
    });
    expect(result.protocol?.ratio).toBe(2);
    expect(result.protocol?.steps.join(' ')).not.toContain('1:1:1');
    expect(selectProtocol('room', hours).ratio).toBe(1);
  });
  it.each([36, 60, 80, 240])(
    'keeps 1:2:2 for room recovery after %s hours regardless of pace',
    (hours) => {
      for (const feedingPace of ['usual', 'longer'] as const) {
        const result = recommend({ ...input, storage: 'room', elapsedHours: hours, feedingPace });
        expect(result.protocol?.ratio).toBe(2);
        expect(result.protocol?.steps.join(' ')).not.toContain('1:1:1');
      }
    },
  );
  it('does not use a slow first cycle as a deadline for automatic refeeding', () => {
    const result = recommend({ ...input, storage: 'room', elapsedHours: 96, activity: 'quiet' });
    expect(result.protocol?.steps.join(' ')).toContain('antes de repetir');
    expect(result.protocol?.steps.join(' ')).toContain('madure');
  });
  for (const storage of ['fridge', 'room'] as StoragePlace[])
    for (const safety of ['contamination', 'mold', 'pink', 'rotten'] as Safety[])
      for (const elapsedHours of [0, 36, 120, 800])
        it(`blocks ${safety} at ${elapsedHours} hours in ${storage}`, () => {
          const result = recommend({ ...input, storage, safety, elapsedHours });
          expect(result.kind).toBe('discard');
          expect(result.protocol).toBeUndefined();
        });
  it('gives contamination priority even outside the hydration scope', () =>
    expect(recommend({ ...input, safety: 'mold', hydration: 80 }).kind).toBe('discard'));
  it('requires inspection before suggesting a protocol', () =>
    expect(recommend({ ...input, safety: 'unknown' }).kind).toBe('inspect'));
  it('does not treat hooch alone as contamination', () =>
    expect(recommend({ ...input, safety: 'hooch' }).kind).toBe('protocol'));
  it('does not recommend an unadapted protocol at another hydration', () =>
    expect(recommend({ ...input, hydration: 80 }).kind).toBe('out-of-scope'));
  it('does not mark a culture ready because a timer has elapsed', () => {
    expect(recommend({ ...input, activity: 'peak', elapsedHours: 800 }).kind).toBe('protocol');
  });
  const fridgeCases: [number, string][] = [
    [0, 'fridge-3'],
    [95.99, 'fridge-3'],
    [96, 'fridge-7'],
    [191.99, 'fridge-7'],
    [192, 'fridge-14'],
    [360, 'fridge-21'],
    [528, 'fridge-30'],
    [744, 'fridge-long'],
  ];
  it.each(fridgeCases)('selects the fridge route at %s hours', (hours, id) =>
    expect(selectProtocol('fridge', hours).id).toBe(id),
  );
  const roomCases: [number, string][] = [
    [0, 'room-12'],
    [11.99, 'room-12'],
    [12, 'room-24'],
    [24, 'room-48'],
    [48, 'room-48'],
    [48.01, 'room-72'],
    [72, 'room-72'],
    [72.01, 'room-long'],
  ];
  it.each(roomCases)('selects the room route at %s hours', (hours, id) =>
    expect(selectProtocol('room', hours).id).toBe(id),
  );
  it.each([-1, NaN, Infinity])('rejects invalid elapsed hours %s', (hours) =>
    expect(() => selectProtocol('room', hours)).toThrow(),
  );
});
describe('refresh calculator', () => {
  it('calculates the reference 200 g recipe + 20 g reserve', () =>
    expect(calculate(200, 20, 2)).toEqual({ starter: 44, water: 88, flour: 88, total: 220 }));
  it.each([1, 2, 3, 5] as const)('preserves total and ingredient ratio for 1:%s:%s', (ratio) => {
    const r = calculate(173, 20, ratio);
    expect(r.starter + r.water + r.flour).toBeCloseTo(193);
    expect(r.water / r.starter).toBeCloseTo(ratio);
  });
  it('keeps displayed amounts consistent after rounding', () => {
    for (const total of [0.1, 1, 17.3, 100, 173, 220.1])
      for (const n of [1, 2, 3, 5] as const) {
        const r = displayedAmounts(total, 0, n);
        expect(Math.round(10 * (r.starter + r.water + r.flour))).toBe(Math.round(10 * r.total));
      }
  });
  it.each([
    [-1, 20],
    [NaN, 20],
    [200, -1],
    [Infinity, 0],
    [0, 0],
  ])('rejects invalid inputs %s / %s', (recipe, reserve) =>
    expect(() => calculate(recipe, reserve, 2)).toThrow(),
  );
});
describe('elapsed time validation', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  it('calculates hours deterministically', () =>
    expect(elapsedHours('2026-11-19T12:00:00Z', now)).toBe(24));
  it('rejects future and invalid dates', () => {
    expect(() => elapsedHours('2026-11-21T12:00:00Z', now)).toThrow();
    expect(() => elapsedHours('', now)).toThrow();
  });
});

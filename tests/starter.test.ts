import { describe, expect, it } from 'vitest';
import {
  applyJournalChange,
  bakingCheckAt,
  calculate,
  createData,
  displayedAmounts,
  displayedAmountsFromStarter,
  feedingRatios,
  elapsedHours,
  feedingBlock,
  fridgeProtocols,
  latestBakingFeeding,
  measuredFeedingRatio,
  observedStarterActivity,
  feedingMaintenanceStatus,
  recommend,
  selectProtocol,
} from '../src/domain/starter';
import type {
  AppData,
  DecisionInput,
  Feeding,
  Observation,
  Safety,
  StoragePlace,
} from '../src/domain/starter';
const input: DecisionInput = {
  storage: 'fridge',
  elapsedHours: 120,
  safety: 'healthy',
  goal: 'bake',
  activity: 'quiet',
  hydration: 100,
};
describe('shared recommendation rules', () => {
  it('recommends 1:1:1 for a healthy starter after a short fridge rest', () => {
    const guideProtocol = selectProtocol('fridge', 72);
    expect(guideProtocol.ratio).toBe(1);
    expect(recommend({ ...input, elapsedHours: 72 }).protocol).toEqual(guideProtocol);
    expect(selectProtocol('fridge', 96).ratio).toBe(2);
  });
  it.each([4, 8, 15, 22, 31])('uses recovery timing after %s days in the fridge', (days) => {
    const guideProtocol = selectProtocol('fridge', days * 24);
    expect(guideProtocol.recoveryTiming).toBeTruthy();
    expect(recommend({ ...input, elapsedHours: days * 24 }).protocol).toEqual(guideProtocol);
  });
  it('selects 1:2:2 for five fridge days, requiring observed growth', () => {
    const result = recommend(input);
    expect(result.kind).toBe('protocol');
    expect(result.protocol?.ratio).toBe(2);
    expect(result.nextCondition).toContain('repetible');
  });
  it('starts prolonged fridge recovery with the owner-agreed 1:2:2 strategy', () => {
    const result = recommend({ ...input, elapsedHours: 25 * 24 });
    expect(result.protocol?.ratio).toBe(2);
    expect(result.protocol?.steps.join(' ')).toContain('10–20 g');
    expect(result.protocol?.recoveryTiming).toContain('12 y las 24 h');
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
  it('waits for a rising starter instead of recommending a feeding at 18 hours', () => {
    const result = recommend({
      ...input,
      goal: 'maintain',
      storage: 'room',
      elapsedHours: 18,
      activity: 'rising',
    });
    expect(result.kind).toBe('wait');
    expect(result.protocol).toBeUndefined();
  });
  it('requires inspection before suggesting a protocol', () =>
    expect(recommend({ ...input, safety: 'unknown' }).kind).toBe('inspect'));
  it('does not treat hooch alone as contamination', () =>
    expect(recommend({ ...input, safety: 'hooch' }).kind).toBe('protocol'));
  it('does not recommend an unadapted protocol at another hydration', () =>
    expect(recommend({ ...input, hydration: 80 }).kind).toBe('out-of-scope'));
  it('does not mark a culture ready because a timer has elapsed', () => {
    expect(recommend({ ...input, activity: 'peak', elapsedHours: 800 }).kind).toBe('protocol');
  });
  it('offers three fridge routes in the guide', () => {
    expect(fridgeProtocols.map(({ id }) => id)).toEqual(['fridge-3', 'fridge-21', 'fridge-long']);
  });
  const fridgeCases: [number, string][] = [
    [0, 'fridge-3'],
    [95.99, 'fridge-3'],
    [96, 'fridge-21'],
    [192, 'fridge-21'],
    [360, 'fridge-21'],
    [527.99, 'fridge-21'],
    [528, 'fridge-long'],
    [744, 'fridge-long'],
  ];
  it.each(fridgeCases)(
    'selects the fridge route at %s hours in the guide and assistant',
    (hours, id) => {
      const protocol = selectProtocol('fridge', hours);
      expect(protocol.id).toBe(id);
      expect(recommend({ ...input, elapsedHours: hours }).protocol).toEqual(protocol);
    },
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
describe('starter maintenance by elapsed time', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const before = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

  it.each([
    [2, 'recent'],
    [5, 'normal'],
    [10, 'overdue'],
    [20, 'possibly_sluggish'],
    [45, 'recovery_recommended'],
    [90, 'long_term_neglect'],
  ] as const)('classifies %s days since the last feeding as %s', (days, expected) => {
    expect(feedingMaintenanceStatus(before(days * 24), now)).toBe(expected);
  });

  it.each([
    [72, 'recent', 'normal'],
    [168, 'normal', 'overdue'],
    [336, 'overdue', 'possibly_sluggish'],
    [720, 'possibly_sluggish', 'recovery_recommended'],
    [1440, 'recovery_recommended', 'long_term_neglect'],
  ] as const)('changes bands immediately after %s hours', (hours, beforeLimit, afterLimit) => {
    const lastFed = before(hours);
    expect(feedingMaintenanceStatus(lastFed, now)).toBe(beforeLimit);
    expect(feedingMaintenanceStatus(lastFed, now + 1)).toBe(afterLimit);
  });

  it('uses elapsed time across daylight saving transitions', () => {
    const fedAt = '2026-03-28T12:00:00+01:00';
    const justBefore = Date.parse('2026-03-31T12:59:59+02:00');
    const limit = Date.parse('2026-03-31T13:00:00+02:00');
    expect(feedingMaintenanceStatus(fedAt, justBefore)).toBe('recent');
    expect(feedingMaintenanceStatus(fedAt, limit + 1)).toBe('normal');
  });

  it('handles missing, invalid and future dates', () => {
    expect(feedingMaintenanceStatus(null, now)).toBe('unknown');
    expect(feedingMaintenanceStatus('invalid', now)).toBe('unknown');
    expect(() => feedingMaintenanceStatus(before(-1), now)).toThrow();
    expect(recommend({ ...input, elapsedHours: null }).kind).toBe('unknown-date');
  });

  const feeding: Feeding = {
    id: 'latest',
    fedAt: before(15),
    ratio: 2,
    starterG: 20,
    waterG: 40,
    flourG: 40,
    temperature: 24,
    storage: 'room',
    notes: '',
  };
  const observation: Observation = {
    id: 'growth',
    observedAt: before(1),
    activity: 'peak',
    safety: 'healthy',
    bubbles: true,
    peakHours: 8,
    notes: '',
  };
  const previous = createData(new Date(before(30 * 24)));
  const fed = applyJournalChange(previous, { type: 'feeding', feeding });

  it('recalculates maintenance after a feeding while activity remains unconfirmed', () => {
    expect(feedingMaintenanceStatus(fed.starter.lastFedAt, now)).toBe('recent');
    expect(observedStarterActivity(fed, feeding.fedAt, 'room', now)).toBe('unknown');
  });

  it('uses observed growth independently of maintenance age', () => {
    const vigorous = { ...fed, observations: [observation] };
    const slow = { ...fed, observations: [{ ...observation, peakHours: 12 }] };
    expect(observedStarterActivity(vigorous, feeding.fedAt, 'room', now)).toBe('active');
    expect(observedStarterActivity(slow, feeding.fedAt, 'room', now)).toBe('sluggish');
    expect(feedingMaintenanceStatus(before(20 * 24), now)).toBe('possibly_sluggish');
    expect(observedStarterActivity(vigorous, before(20 * 24), 'room', now)).toBe('unknown');
  });

  it.each([{ peakHours: null }, { peakHours: 0 }, { peakHours: 20 }, { bubbles: false }])(
    'leaves activity unconfirmed without valid peak evidence: %o',
    (changes) => {
      const observed = { ...fed, observations: [{ ...observation, ...changes }] };
      expect(observedStarterActivity(observed, feeding.fedAt, 'room', now)).toBe('unknown');
    },
  );

  it('does not reuse observations from before refrigeration or use early growth as peak evidence', () => {
    const refrigerated: AppData = {
      ...fed,
      starter: { ...fed.starter, storage: 'fridge', storageChangedAt: before(0.5) },
      observations: [observation],
    };
    const early: AppData = {
      ...fed,
      observations: [{ ...observation, activity: 'rising' }],
    };
    expect(observedStarterActivity(refrigerated, feeding.fedAt, 'fridge', now)).toBe('unknown');
    expect(observedStarterActivity(early, feeding.fedAt, 'room', now)).toBe('unknown');
  });
});
describe('refresh calculator', () => {
  it('calculates the reference 200 g recipe + 40 g reserve', () =>
    expect(calculate(200, 40, 2)).toEqual({ starter: 48, water: 96, flour: 96, total: 240 }));
  it.each(feedingRatios)('preserves total and ingredient ratio for 1:%s:%s', (ratio) => {
    const r = calculate(173, 20, ratio);
    expect(r.starter + r.water + r.flour).toBeCloseTo(193);
    expect(r.water / r.starter).toBeCloseTo(ratio);
  });
  it('uses the entered starter to calculate both additions and the total', () => {
    const amounts = displayedAmountsFromStarter(20.7, 4);
    expect(amounts).toEqual({ starter: 20.7, water: 82.8, flour: 82.8, total: 186.3 });
    expect(
      measuredFeedingRatio({
        starterG: amounts.starter,
        waterG: amounts.water,
        flourG: amounts.flour,
      }),
    ).toBe(4);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid initial starter amounts of %s', (starter) => {
    expect(() => displayedAmountsFromStarter(starter, 4)).toThrow();
  });
  it('keeps displayed amounts consistent after rounding', () => {
    for (const total of [0.1, 1, 17.3, 100, 173, 220.1])
      for (const n of feedingRatios) {
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

describe('journal actions', () => {
  const fedAt = '2026-11-20T12:00:00.000Z';
  const data: AppData = {
    ...createData(new Date(fedAt)),
    recovery: { goal: 'bake', stage: 'feed', confirmations: 1 },
  };
  const feeding: Feeding = {
    fedAt,
    id: 'refresh',
    ratio: 1,
    starterG: 20,
    waterG: 20,
    flourG: 20,
    temperature: 24,
    storage: 'room',
    notes: '',
  };

  it('breaks the recovery streak after an intervening feeding', () => {
    const interrupted = applyJournalChange(data, { type: 'feeding', feeding });
    expect(interrupted.recovery).toEqual({ goal: 'bake', stage: 'feed', confirmations: 0 });
    const resumed = applyJournalChange(interrupted, {
      type: 'feeding',
      recoveryStage: 'feed',
      feeding: { ...feeding, id: 'next', fedAt: '2026-11-20T16:00:00.000Z' },
    });
    expect(resumed.recovery).toEqual({
      goal: 'bake',
      stage: 'observe',
      feedingId: 'next',
      confirmations: 0,
    });
  });

  it('keeps a recovery confirmation when logging an older feeding', () => {
    const newer = { ...data, starter: { ...data.starter, lastFedAt: '2026-11-20T16:00:00.000Z' } };
    expect(applyJournalChange(newer, { type: 'feeding', feeding }).recovery).toEqual(data.recovery);
  });

  it('preserves the starter details when recording an observation', () => {
    const fed = applyJournalChange(data, { type: 'feeding', feeding });
    const observed = applyJournalChange(fed, {
      type: 'observation',
      observation: {
        id: 'check',
        observedAt: '2026-11-20T13:00:00.000Z',
        safety: 'healthy',
        activity: 'rising',
        bubbles: true,
        peakHours: null,
        notes: '',
      },
    });
    expect(observed.starter).toEqual(fed.starter);
    expect(observed.observations.map((entry) => entry.id)).toEqual(['check']);
  });

  it('updates the current feeding and recalculates its timer when editing weights and date', () => {
    const active = {
      ...feeding,
      bakingCheck: { at: bakingCheckAt(fedAt, 1, true), safety: 'healthy' as const },
    };
    const recorded = applyJournalChange(data, { type: 'feeding', feeding: active });
    const nextDate = '2026-11-20T13:00:00.000Z';
    const result = applyJournalChange(recorded, {
      type: 'revise-feeding',
      original: active,
      feeding: { ...feeding, fedAt: nextDate, waterG: 40, flourG: 40, ratio: 2 },
    });
    expect(result.feedings).toHaveLength(1);
    expect(result.starter.lastFedAt).toBe(nextDate);
    expect(latestBakingFeeding(result)?.bakingCheck?.at).toBe('2026-11-20T19:00:00.000Z');
  });

  it('falls back to the previous feeding without reviving its old timer', () => {
    const older = {
      ...feeding,
      bakingCheck: { at: bakingCheckAt(fedAt, 1, true), safety: 'healthy' as const },
    };
    const latest = { ...feeding, id: 'current', fedAt: '2026-11-20T16:00:00.000Z' };
    let recorded = applyJournalChange(data, { type: 'feeding', feeding: older });
    recorded = applyJournalChange(recorded, {
      type: 'feeding',
      feeding: latest,
      recoveryStage: 'feed',
    });
    const deleted = applyJournalChange(recorded, { type: 'revise-feeding', original: latest });
    expect(deleted.feedings.map((entry) => entry.id)).toEqual([older.id]);
    expect(deleted.starter.lastFedAt).toBe(fedAt);
    expect(latestBakingFeeding(deleted)).toBeUndefined();
    expect(deleted.recovery).toEqual({ goal: 'bake', stage: 'feed', confirmations: 0 });
    expect(
      applyJournalChange(deleted, { type: 'revise-feeding', original: deleted.feedings[0] }).starter
        .lastFedAt,
    ).toBeNull();
  });

  it('preserves a separately indicated last feeding and a later storage move', () => {
    const recorded = applyJournalChange(data, { type: 'feeding', feeding });
    const movedAt = '2026-11-20T17:00:00.000Z';
    const moved = applyJournalChange(recorded, {
      type: 'starter',
      changes: { storage: 'fridge', storageChangedAt: movedAt },
    });
    const edited = applyJournalChange(moved, {
      type: 'revise-feeding',
      original: feeding,
      feeding: { ...feeding, temperature: 22 },
    });
    expect(edited.starter).toMatchObject({
      temperature: 22,
      storage: 'fridge',
      storageChangedAt: movedAt,
    });
    const manual = applyJournalChange(edited, { type: 'starter', changes: { lastFedAt: movedAt } });
    expect(
      applyJournalChange(manual, { type: 'revise-feeding', original: edited.feedings[0] }).starter,
    ).toEqual(manual.starter);
  });

  it('preserves recovery and the check time after a notes-only edit', () => {
    const active = {
      ...feeding,
      bakingCheck: { at: bakingCheckAt(fedAt, 1, true), safety: 'healthy' as const },
    };
    const recorded = applyJournalChange(data, {
      type: 'feeding',
      feeding: active,
      recoveryStage: 'feed',
    });
    const edited = applyJournalChange(recorded, {
      type: 'revise-feeding',
      original: active,
      feeding: { ...feeding, notes: 'Corrected note' },
    });
    expect(edited.recovery).toEqual(recorded.recovery);
    expect(edited.feedings[0].bakingCheck).toEqual(active.bakingCheck);
  });

  const observation: Observation = {
    id: 'observation',
    observedAt: fedAt,
    safety: 'mold',
    activity: 'unknown',
    bubbles: false,
    peakHours: null,
    notes: '',
  };
  it('edits and deletes an observation without clearing the culture safety block', () => {
    const recorded = applyJournalChange(data, { type: 'observation', observation });
    const replacement = { ...observation, safety: 'unknown' as const, notes: 'Corrected note' };
    const edited = applyJournalChange(recorded, {
      type: 'revise-observation',
      original: observation,
      observation: replacement,
    });
    expect(edited.observations).toEqual([replacement]);
    const deleted = applyJournalChange(edited, {
      type: 'revise-observation',
      original: replacement,
    });
    expect(deleted.observations).toEqual([]);
    expect(feedingBlock(deleted)).toMatchObject({ blocked: true, contamination: 'mold' });
    expect(feedingBlock(applyJournalChange(deleted, { type: 'reset' })).blocked).toBe(false);
    expect(
      feedingBlock(
        applyJournalChange(recorded, { type: 'revise-observation', original: observation }),
      ).blocked,
    ).toBe(true);
  });

  it('uses the recorded amounts to choose the baking check time', () => {
    const edited = { ...feeding, ratio: 5 };
    const ratio = measuredFeedingRatio(edited);
    expect(ratio).toBe(1);
    expect(bakingCheckAt(fedAt, ratio, true)).toBe('2026-11-20T16:00:00.000Z');
    expect(bakingCheckAt(fedAt, measuredFeedingRatio({ ...feeding, waterG: 35 }), true)).toBe(
      '2026-11-21T00:00:00.000Z',
    );
  });

  it('recognizes the rounded amounts suggested by the calculator', () => {
    const { starter, water, flour } = displayedAmounts(210, 0, 5);
    expect(measuredFeedingRatio({ starterG: starter, waterG: water, flourG: flour })).toBe(5);
  });
});

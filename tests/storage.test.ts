import { describe, expect, it } from 'vitest';
import type { AppData, Safety } from '../src/domain/starter';
import { bakingCheckAt, createData, latestBakingFeeding } from '../src/domain/starter';
import { isAppData, loadData, saveData } from '../src/storage/local';
const data = createData(new Date('2026-11-20T12:00:00Z'));
describe('local storage', () => {
  it('starts empty without fabricating observations or a feeding date', () => {
    const { data, error } = loadData({ getItem: () => null, setItem: () => {} });
    expect(error).toBeNull();
    expect(data.feedings).toEqual([]);
    expect(data.observations).toEqual([]);
    expect(data.starter.lastFedAt).toBeNull();
  });
  it('round trips the local schema', () => {
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    expect(saveData(storage, data)).toBe(true);
    expect(loadData(storage)).toEqual({ data, error: null });
  });
  it('restores a baking timer for the current feeding without treating an older timer as current', () => {
    const feeding: AppData['feedings'][number] = {
      id: 'baking-feeding',
      fedAt: '2026-11-20T12:00:00.000Z',
      ratio: 3,
      starterG: 20,
      waterG: 60,
      flourG: 60,
      temperature: 24,
      storage: 'room',
      notes: '',
      bakingCheck: { at: bakingCheckAt('2026-11-20T12:00:00.000Z', 3, true), safety: 'healthy' },
    };
    const stored = {
      ...data,
      starter: { ...data.starter, storage: 'room' as const, lastFedAt: feeding.fedAt },
      feedings: [feeding],
    };
    const loaded = loadData({ getItem: () => JSON.stringify(stored), setItem: () => {} });
    expect(loaded.error).toBeNull();
    expect(latestBakingFeeding(loaded.data)?.bakingCheck?.at).toBe('2026-11-20T18:30:00.000Z');
    expect(bakingCheckAt(feeding.fedAt, 3, false)).toBe('2026-11-21T00:00:00.000Z');
    expect(
      latestBakingFeeding({
        ...loaded.data,
        starter: { ...loaded.data.starter, lastFedAt: '2026-11-20T13:00:00.000Z' },
      }),
    ).toBeUndefined();
    expect(
      isAppData({
        ...stored,
        feedings: [{ ...feeding, bakingCheck: { at: feeding.fedAt, safety: 'healthy' } }],
      }),
    ).toBe(false);
  });
  it('retains a recovery cycle and stops showing a baking clock after a storage move', () => {
    const fedAt = '2026-11-20T12:00:00.000Z';
    const stored: AppData = {
      ...data,
      starter: { ...data.starter, storage: 'room', storageChangedAt: fedAt, lastFedAt: fedAt },
      recovery: { goal: 'bake', stage: 'observe', feedingId: 'cycle', confirmations: 1 },
      feedings: [
        {
          id: 'cycle',
          fedAt,
          ratio: 1,
          starterG: 20,
          waterG: 20,
          flourG: 20,
          temperature: 24,
          storage: 'room',
          notes: '',
          bakingCheck: { at: bakingCheckAt(fedAt, 1, true), safety: 'healthy' },
        },
      ],
    };
    expect(loadData({ getItem: () => JSON.stringify(stored), setItem: () => {} }).data).toEqual(
      stored,
    );
    expect(latestBakingFeeding(stored)?.id).toBe('cycle');
    expect(
      latestBakingFeeding({
        ...stored,
        starter: { ...stored.starter, storage: 'fridge', storageChangedAt: '2026-11-20T13:00:00Z' },
      }),
    ).toBeUndefined();
    expect(isAppData({ ...stored, recovery: { ...stored.recovery, confirmations: 2 } })).toBe(
      false,
    );
  });
  it.each(['contamination', 'mold', 'pink'] as Safety[])(
    'loads grouped and legacy contamination observations without changing %s',
    (safety) => {
      const stored = {
        ...data,
        observations: [
          {
            id: 'observation',
            observedAt: '2026-11-20T12:00:00Z',
            safety,
            activity: 'unknown',
            rise: null,
            peakHours: null,
            bubbles: false,
            aroma: '',
            notes: '',
          },
        ],
      };
      const result = loadData({ getItem: () => JSON.stringify(stored), setItem: () => {} });
      expect(result.error).toBeNull();
      expect(result.data.observations[0].safety).toBe(safety);
    },
  );
  it('reports corrupted data without overwriting the original', () => {
    let writes = 0;
    const result = loadData({
      getItem: () => '{broken',
      setItem: () => {
        writes++;
      },
    });
    expect(result.error).not.toBeNull();
    expect(writes).toBe(0);
  });
  it('rejects incompatible versions and malformed nested entries', () => {
    expect(isAppData({ ...data, version: 2 })).toBe(false);
    expect(isAppData({ ...data, starter: { ...data.starter, temperature: '24' } })).toBe(false);
    expect(isAppData({ ...data, feedings: [{}] })).toBe(false);
    expect(isAppData({ ...data, observations: [{ safety: 'healthy' }] })).toBe(false);
  });
  it('reports denied and full storage', () => {
    expect(
      loadData({
        getItem: () => {
          throw new Error('Denied');
        },
        setItem: () => {},
      }).error,
    ).not.toBeNull();
    expect(
      saveData(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('Quota exceeded');
          },
        },
        data,
      ),
    ).toBe(false);
  });
});

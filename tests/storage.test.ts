import { describe, expect, it } from 'vitest';
import type { AppData, Safety } from '../src/domain/starter';
import { bakingCheckAt, createData, latestBakingFeeding } from '../src/domain/starter';
import { createJournal, isAppData } from '../src/storage/local';
const data = createData(new Date('2026-11-20T12:00:00Z'));
const load = (storage: Parameters<typeof createJournal>[0]) => createJournal(storage).snapshot();

describe('local storage', () => {
  it('starts empty without fabricating observations or a feeding date', () => {
    const { data, unreadable } = load({ getItem: () => null, setItem: () => {} });
    expect(unreadable).toBe(false);
    expect(data.feedings).toEqual([]);
    expect(data.observations).toEqual([]);
    expect(data.starter.lastFedAt).toBeNull();
  });
  it('round trips the local schema', () => {
    let raw: string | null = JSON.stringify(data);
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const journal = createJournal(storage);
    expect(
      journal.update({ type: 'starter', changes: { name: 'New name' } }, journal.snapshot().data),
    ).toBe('saved');
    expect(load(storage).data).toEqual({ ...data, starter: { ...data.starter, name: 'New name' } });
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
    const loaded = load({ getItem: () => JSON.stringify(stored), setItem: () => {} });
    expect(loaded.unreadable).toBe(false);
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
    expect(load({ getItem: () => JSON.stringify(stored), setItem: () => {} }).data).toEqual(stored);
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
      const result = load({ getItem: () => JSON.stringify(stored), setItem: () => {} });
      expect(result.unreadable).toBe(false);
      expect(result.data.observations[0].safety).toBe(safety);
    },
  );
  it('reports corrupted data without overwriting the original', () => {
    let writes = 0;
    const result = load({
      getItem: () => '{broken',
      setItem: () => {
        writes++;
      },
    });
    expect(result.unreadable).toBe(true);
    expect(writes).toBe(0);
  });
  it('rejects incompatible versions and malformed nested entries', () => {
    expect(isAppData({ ...data, version: 2 })).toBe(false);
    expect(isAppData({ ...data, starter: { ...data.starter, temperature: '24' } })).toBe(false);
    expect(isAppData({ ...data, feedings: [{}] })).toBe(false);
    expect(isAppData({ ...data, observations: [{ safety: 'healthy' }] })).toBe(false);
  });
  it('reports denied storage and treats an empty saved value as unreadable', () => {
    const setItem = () => {
      throw new Error('Unexpected write');
    };
    expect(
      load({
        getItem: () => {
          throw new Error('Denied');
        },
        setItem,
      }).unreadable,
    ).toBe(true);
    const journal = createJournal({ getItem: () => '', setItem });
    expect(journal.snapshot()).toMatchObject({ unreadable: true, original: '' });
    expect(journal.retry()).toBe('blocked');
  });

  it('keeps quota-failed edits in memory and retries against the same saved copy', () => {
    let raw = JSON.stringify(data);
    let full = true;
    const journal = createJournal({
      getItem: () => raw,
      setItem: (_key, value) => {
        if (full) throw new Error('Quota exceeded');
        raw = value;
      },
    });
    const change = { type: 'starter', changes: { name: 'Draft' } } as const;
    expect(journal.update(change, journal.snapshot().data)).toBe('memory');
    journal.refresh();
    expect(journal.snapshot().data.starter.name).toBe('Draft');
    expect(journal.snapshot().pending).toBe(true);
    full = false;
    expect(journal.retry()).toBe('saved');
    expect(journal.snapshot().pending).toBe(false);
    expect(JSON.parse(raw).starter.name).toBe('Draft');
  });

  it.each(['other tab', 'unreadable'])(
    'preserves pending edits and blocks retry after a %s update',
    (source) => {
      let raw = JSON.stringify(data);
      let writes = 0;
      const journal = createJournal({
        getItem: () => raw,
        setItem: () => {
          writes++;
          throw new Error('Quota exceeded');
        },
      });
      expect(
        journal.update({ type: 'starter', changes: { name: 'Draft' } }, journal.snapshot().data),
      ).toBe('memory');
      raw =
        source === 'other tab'
          ? JSON.stringify({ ...data, starter: { ...data.starter, name: 'Other name' } })
          : '{broken';
      journal.refresh();
      expect(journal.snapshot()).toMatchObject({ pending: true, conflict: true });
      expect(journal.snapshot().data.starter.name).toBe('Draft');
      expect(journal.retry()).toBe('blocked');
      expect(journal.replaceUnreadable(raw)).toBe('blocked');
      expect(writes).toBe(1);
    },
  );

  it('requires another confirmation if the unreadable data changes before replacement', () => {
    let raw = '{first';
    let full = true;
    const journal = createJournal({
      getItem: () => raw,
      setItem: (_key, value) => {
        if (full) throw new Error('Quota exceeded');
        raw = value;
      },
    });
    expect(journal.replaceUnreadable('{first')).toBe('memory');
    expect(journal.snapshot()).toMatchObject({ unreadable: true, original: '{first' });
    raw = '{second';
    full = false;
    expect(journal.replaceUnreadable('{first')).toBe('blocked');
    expect(raw).toBe('{second');
    expect(journal.replaceUnreadable('{second')).toBe('saved');
    expect(journal.snapshot().unreadable).toBe(false);
  });

  it('blocks stale updates before writing after an external change', () => {
    let raw = JSON.stringify(data);
    const journal = createJournal({
      getItem: () => raw,
      setItem: () => {
        throw new Error('Unexpected write');
      },
    });
    const stale = journal.snapshot().data;
    raw = JSON.stringify({ ...data, starter: { ...data.starter, name: 'Other tab' } });
    expect(journal.update({ type: 'starter', changes: { name: 'Stale tab' } }, stale)).toBe(
      'blocked',
    );
    expect(journal.snapshot().data.starter.name).toBe('Other tab');
  });
});

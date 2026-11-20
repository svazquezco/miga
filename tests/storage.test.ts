import { describe, expect, it } from 'vitest';
import type { Safety } from '../src/domain/starter';
import { createData } from '../src/domain/starter';
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

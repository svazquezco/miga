import { applyJournalChange, createData } from '../domain/starter';
import type { AppData, JournalChange } from '../domain/starter';
export const STORAGE_KEY = 'miga:starter:v1';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isAppData(value: unknown): value is AppData {
  if (
    !record(value) ||
    value.version !== 1 ||
    !record(value.starter) ||
    !Array.isArray(value.feedings) ||
    !Array.isArray(value.observations)
  )
    return false;
  const s = value.starter;
  if (
    s.id !== 'my-starter' ||
    typeof s.name !== 'string' ||
    !s.name.trim() ||
    typeof s.flour !== 'string' ||
    !finite(s.hydration) ||
    s.hydration <= 0 ||
    !finite(s.temperature) ||
    !(s.storage === 'fridge' || s.storage === 'room') ||
    !(s.lastFedAt === null || date(s.lastFedAt)) ||
    (s.storageChangedAt !== undefined && !date(s.storageChangedAt)) ||
    !date(s.createdAt)
  )
    return false;
  const recovery = value.recovery;
  if (
    recovery !== undefined &&
    (!record(recovery) ||
      (recovery.goal !== 'bake' && recovery.goal !== 'maintain') ||
      (recovery.confirmations !== 0 && recovery.confirmations !== 1) ||
      (recovery.stage !== 'start' &&
        recovery.stage !== 'feed' &&
        !(recovery.stage === 'observe' && typeof recovery.feedingId === 'string')))
  )
    return false;
  return (
    value.feedings.every(
      (f) =>
        record(f) &&
        typeof f.id === 'string' &&
        date(f.fedAt) &&
        typeof f.ratio === 'number' &&
        [1, 2, 3, 5].includes(f.ratio) &&
        [f.starterG, f.waterG, f.flourG].every((n) => finite(n) && n > 0) &&
        finite(f.temperature) &&
        (f.storage === 'fridge' || f.storage === 'room') &&
        typeof f.notes === 'string' &&
        (f.bakingCheck === undefined ||
          (record(f.bakingCheck) &&
            date(f.bakingCheck.at) &&
            Date.parse(String(f.bakingCheck.at)) > Date.parse(String(f.fedAt)) &&
            (f.bakingCheck.safety === 'healthy' || f.bakingCheck.safety === 'hooch'))),
    ) &&
    value.observations.every(
      (o) =>
        record(o) &&
        typeof o.id === 'string' &&
        date(o.observedAt) &&
        typeof o.safety === 'string' &&
        ['unknown', 'healthy', 'hooch', 'contamination', 'mold', 'pink', 'rotten'].includes(
          o.safety,
        ) &&
        typeof o.activity === 'string' &&
        ['unknown', 'quiet', 'rising', 'peak', 'fallen'].includes(o.activity) &&
        (o.rise === null || (finite(o.rise) && o.rise >= 0)) &&
        typeof o.bubbles === 'boolean' &&
        typeof o.aroma === 'string' &&
        (o.peakHours === null || (finite(o.peakHours) && o.peakHours >= 0)) &&
        typeof o.notes === 'string',
    )
  );
}
export const browserStorage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

export type SaveResult = 'saved' | 'memory' | 'blocked';

export async function withJournalLock(write: () => SaveResult): Promise<SaveResult> {
  if (!navigator.locks) return write();
  try {
    return await navigator.locks.request(STORAGE_KEY, write);
  } catch {
    return 'blocked';
  }
}
type StoredJournal =
  { kind: 'readable'; raw: string | null; data: AppData } | { kind: 'unreadable'; raw?: string };

function readJournal(storage: StorageLike): StoredJournal {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { kind: 'readable', raw, data: createData() };
    const data: unknown = JSON.parse(raw);
    if (isAppData(data)) return { kind: 'readable', raw, data };
  } catch {
    // Preserve the original if it could be read but not decoded.
  }
  return { kind: 'unreadable', raw: raw ?? undefined };
}

export function createJournal(storage: StorageLike) {
  let stored = readJournal(storage);
  let data = stored.kind === 'readable' ? stored.data : createData();
  let base = stored.kind === 'readable' ? stored.raw : undefined;
  let pending = false;

  function refresh() {
    stored = readJournal(storage);
    if (!pending && stored.kind === 'readable' && stored.raw !== base) {
      base = stored.raw;
      data = stored.data;
    }
  }

  function persist(next: AppData): SaveResult {
    try {
      const raw = JSON.stringify(next);
      storage.setItem(STORAGE_KEY, raw);
      stored = { kind: 'readable', raw, data: next };
      base = raw;
      data = next;
      pending = false;
      return 'saved';
    } catch {
      return 'memory';
    }
  }

  function update(change: JournalChange, expected: AppData): SaveResult {
    refresh();
    if (stored.kind === 'unreadable' || (pending && stored.raw !== base) || expected !== data)
      return 'blocked';

    data = applyJournalChange(data, change);
    const result = persist(data);
    pending = result === 'memory';
    return result;
  }

  function retry(): SaveResult {
    refresh();
    if (!pending || stored.kind === 'unreadable' || stored.raw !== base) return 'blocked';
    return persist(data);
  }

  function replaceUnreadable(original: string): SaveResult {
    refresh();
    if (pending || stored.kind !== 'unreadable' || stored.raw !== original) return 'blocked';
    return persist(createData());
  }

  function snapshot() {
    return {
      data,
      pending,
      unreadable: stored.kind === 'unreadable',
      original: stored.kind === 'unreadable' ? stored.raw : undefined,
      conflict: pending && (stored.kind === 'unreadable' || stored.raw !== base),
    };
  }

  return { refresh, snapshot, update, retry, replaceUnreadable };
}

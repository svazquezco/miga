import { createData } from '../domain/starter';
import type { AppData } from '../domain/starter';
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
    !['fridge', 'room'].includes(String(s.storage)) ||
    !(s.lastFedAt === null || date(s.lastFedAt)) ||
    !date(s.createdAt)
  )
    return false;
  return (
    value.feedings.every(
      (f) =>
        record(f) &&
        typeof f.id === 'string' &&
        date(f.fedAt) &&
        [1, 2, 3, 5].includes(Number(f.ratio)) &&
        [f.starterG, f.waterG, f.flourG].every((n) => finite(n) && n > 0) &&
        finite(f.temperature) &&
        ['fridge', 'room'].includes(String(f.storage)) &&
        typeof f.notes === 'string',
    ) &&
    value.observations.every(
      (o) =>
        record(o) &&
        typeof o.id === 'string' &&
        date(o.observedAt) &&
        ['unknown', 'healthy', 'hooch', 'contamination', 'mold', 'pink', 'rotten'].includes(
          String(o.safety),
        ) &&
        ['unknown', 'quiet', 'rising', 'peak', 'fallen'].includes(String(o.activity)) &&
        (o.rise === null || (finite(o.rise) && o.rise >= 0)) &&
        typeof o.bubbles === 'boolean' &&
        typeof o.aroma === 'string' &&
        (o.peakHours === null || (finite(o.peakHours) && o.peakHours >= 0)) &&
        typeof o.notes === 'string',
    )
  );
}
export function loadData(storage: StorageLike): { data: AppData; error: string | null } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { data: createData(), error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!isAppData(parsed)) throw new Error('Invalid stored data');
    return { data: parsed, error: null };
  } catch {
    return {
      data: createData(),
      error:
        'No hemos podido leer tus datos locales. No los sobrescribiremos. Puedes descargar una copia desde los ajustes.',
    };
  }
}
export function saveData(storage: StorageLike, data: AppData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export const browserStorage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

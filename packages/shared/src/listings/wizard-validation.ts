import type { ListingWizardUiKind } from './listing-field-registry.js';
import { LISTING_FIELD_REGISTRY } from './listing-field-registry.js';

export type WizardValidationResult = { ok: true } | { ok: false; reason: string; step?: number };

export const WIZARD_STEP_TITLES = [
  'Тип объекта',
  'Адрес и карта',
  'Параметры',
  'Ответственный',
  'Публикация',
] as const;

function num(s: string): number | undefined {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function intNum(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function hasPositive(value: string): boolean {
  const n = num(value);
  return n != null && n > 0;
}

function hasIntegerInRange(value: string, min: number, max?: number): boolean {
  const n = intNum(value);
  if (n == null) return false;
  return n >= min && (max == null || n <= max);
}

export type WizardDraftSlice = {
  kind: ListingWizardUiKind | null;
  regionId: number | null;
  blockId: string;
  address: string;
  lat: string;
  lng: string;
  price: string;
  ownerUserId: string | null;
  ownerMode: 'self' | 'agent' | 'agency';
  apartment: Record<string, string | boolean>;
  house: Record<string, string | boolean>;
  land: Record<string, string | boolean>;
  commercial: Record<string, string | boolean>;
  parking: Record<string, string | boolean>;
  extraPhotoUrls: string[];
};

export function validateWizardStep(draft: WizardDraftSlice, step: number): WizardValidationResult {
  if (step === 0) {
    if (!draft.kind) return { ok: false, reason: 'Выберите тип объекта' };
    return { ok: true };
  }
  if (step === 1) {
    if (!draft.regionId) return { ok: false, reason: 'Выберите регион' };
    const p = num(draft.price);
    if (p == null || p < 1) return { ok: false, reason: 'Укажите цену в рублях' };
    const hasBlock = intNum(draft.blockId) != null;
    const hasAddress = draft.address.trim().length > 0;
    if (!hasBlock && !hasAddress) return { ok: false, reason: 'Укажите ЖК или адрес объекта' };
    const hasLat = draft.lat.trim().length > 0;
    const hasLng = draft.lng.trim().length > 0;
    if (hasLat !== hasLng) return { ok: false, reason: 'Заполните широту и долготу вместе' };
    const lat = num(draft.lat);
    if (hasLat && (lat == null || lat < -90 || lat > 90)) {
      return { ok: false, reason: 'Широта должна быть числом от -90 до 90' };
    }
    const lng = num(draft.lng);
    if (hasLng && (lng == null || lng < -180 || lng > 180)) {
      return { ok: false, reason: 'Долгота должна быть числом от -180 до 180' };
    }
    return { ok: true };
  }
  if (step === 2 && draft.kind) {
    const fields = LISTING_FIELD_REGISTRY[draft.kind];
    for (const field of fields) {
      if (!field.required) continue;
      const group = draft[field.group] as Record<string, string | boolean>;
      const raw = group[field.key];
      if (field.type === 'boolean') continue;
      if (typeof raw !== 'string' || !hasPositive(raw)) {
        return { ok: false, reason: `Укажите: ${field.label}` };
      }
    }
    const house = draft.house;
    const yearBuilt = typeof house.yearBuilt === 'string' ? house.yearBuilt : '';
    if (yearBuilt.trim() && !hasIntegerInRange(yearBuilt, 1800, new Date().getFullYear() + 5)) {
      return { ok: false, reason: 'Проверьте год постройки' };
    }
    const apt = draft.apartment;
    const floorsTotal = typeof apt.floorsTotal === 'string' ? apt.floorsTotal : '';
    if (floorsTotal.trim() && !hasIntegerInRange(floorsTotal, 1)) {
      return { ok: false, reason: 'Этажей в доме должно быть целым числом от 1' };
    }
    if (draft.extraPhotoUrls.length > 24) {
      return { ok: false, reason: 'В галерее может быть не более 24 фото' };
    }
    return { ok: true };
  }
  if (step === 3) {
    if (draft.ownerMode === 'agent' && !draft.ownerUserId) {
      return { ok: false, reason: 'Выберите ответственного агента' };
    }
    return { ok: true };
  }
  return { ok: true };
}

export function validateWizardDraft(draft: WizardDraftSlice): WizardValidationResult & { step?: number } {
  for (let i = 0; i < WIZARD_STEP_TITLES.length; i += 1) {
    const result = validateWizardStep(draft, i);
    if (!result.ok) return { ...result, step: i };
  }
  return { ok: true };
}

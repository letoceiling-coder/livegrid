import type { EntityFieldSchema } from '../types/schema';

function isEmpty(field: EntityFieldSchema, v: unknown): boolean {
  if (v === null || v === undefined || v === '') {
    return true;
  }
  if (field.type === 'boolean') {
    return false;
  }
  return false;
}

function normalizeEnum(f: EntityFieldSchema): string[] | null {
  const raw = f.validation_enum;
  if (raw == null) return null;
  if (Array.isArray(raw) && raw.length) {
    return raw.map(x => String(x));
  }
  return null;
}

/** Best-effort PCRE → JS RegExp (delimited /pattern/flags or plain pattern). */
function regexFromSchema(pattern: string | null | undefined): RegExp | null {
  if (!pattern?.trim()) return null;
  const p = pattern.trim();
  const m = p.match(/^\/(.+)\/([gimsuy]*)$/);
  try {
    if (m) return new RegExp(m[1], m[2] || undefined);
    return new RegExp(p);
  } catch {
    return null;
  }
}

function valueMatchesEnum(enumList: string[], v: unknown): boolean {
  const s = String(v);
  return enumList.some(allowed => String(allowed) === s);
}

/**
 * Client-side validation before submit. Returns API-shaped errors or null.
 */
export function validateEntityForm(
  fields: EntityFieldSchema[],
  values: Record<string, unknown>,
): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};

  for (const f of fields) {
    const v = values[f.code];
    const enumList = normalizeEnum(f);

    if (f.is_required && isEmpty(f, v)) {
      errors[f.code] = [`Поле «${f.name}» обязательно.`];
      continue;
    }

    if (isEmpty(f, v)) {
      continue;
    }

    if (f.ui_type === 'number' || f.type === 'integer' || f.type === 'float') {
      const num = typeof v === 'number' ? v : Number(v);
      if (Number.isNaN(num)) {
        errors[f.code] = ['Введите число.'];
        continue;
      }
      const min = f.validation_min;
      const max = f.validation_max;
      if (min != null && num < min) {
        errors[f.code] = [`Не меньше ${min}.`];
      }
      if (max != null && num > max) {
        errors[f.code] = [`Не больше ${max}.`];
      }
      if (enumList && !valueMatchesEnum(enumList, num)) {
        errors[f.code] = ['Недопустимое значение.'];
      }
    }

    if (f.ui_type === 'select' && !f.relation_target_type) {
      const s = String(v);
      if (f.is_required && s === '') {
        errors[f.code] = [`Поле «${f.name}» обязательно.`];
      }
      if (enumList && !valueMatchesEnum(enumList, s)) {
        errors[f.code] = ['Недопустимое значение.'];
      }
      const minL = f.validation_min_length;
      const maxL = f.validation_max_length;
      if (minL != null && s.length < minL) {
        errors[f.code] = [`Минимальная длина — ${minL} символов.`];
      }
      if (maxL != null && s.length > maxL) {
        errors[f.code] = [`Максимальная длина — ${maxL} символов.`];
      }
      const rx = regexFromSchema(f.validation_pattern);
      if (rx && !rx.test(s)) {
        errors[f.code] = ['Значение не соответствует формату.'];
      }
    }

    if (f.type === 'multi_select' && Array.isArray(v) && enumList) {
      for (const item of v) {
        if (!valueMatchesEnum(enumList, item)) {
          errors[f.code] = ['Недопустимое значение.'];
          break;
        }
      }
    }

    if (f.ui_type === 'relation') {
      const id = typeof v === 'number' ? v : Number(v);
      if (f.is_required && (!Number.isFinite(id) || id <= 0)) {
        errors[f.code] = [`Поле «${f.name}» обязательно.`];
      }
      if (enumList && !valueMatchesEnum(enumList, id)) {
        errors[f.code] = ['Недопустимое значение.'];
      }
    }

    if (f.ui_type === 'string' || f.ui_type === 'text' || f.type === 'text' || f.type === 'string') {
      const s = String(v);
      const minL = f.validation_min_length;
      const maxL = f.validation_max_length;
      if (minL != null && s.length < minL) {
        errors[f.code] = [`Минимальная длина — ${minL} символов.`];
      }
      if (maxL != null && s.length > maxL) {
        errors[f.code] = [`Максимальная длина — ${maxL} символов.`];
      }
      const rx = regexFromSchema(f.validation_pattern);
      if (rx && !rx.test(s)) {
        errors[f.code] = ['Значение не соответствует формату.'];
      }
      if (enumList && !valueMatchesEnum(enumList, s)) {
        errors[f.code] = ['Недопустимое значение.'];
      }
    }

    if (f.ui_type === 'date' || f.type === 'date' || f.type === 'datetime') {
      const s = String(v);
      const minL = f.validation_min_length;
      const maxL = f.validation_max_length;
      if (minL != null && s.length < minL) {
        errors[f.code] = [`Минимальная длина — ${minL} символов.`];
      }
      if (maxL != null && s.length > maxL) {
        errors[f.code] = [`Максимальная длина — ${maxL} символов.`];
      }
      const rx = regexFromSchema(f.validation_pattern);
      if (enumList && !valueMatchesEnum(enumList, s)) {
        errors[f.code] = ['Недопустимое значение.'];
      } else if (rx && !rx.test(s)) {
        errors[f.code] = ['Значение не соответствует формату.'];
      }
    }
  }

  return Object.keys(errors).length ? errors : null;
}

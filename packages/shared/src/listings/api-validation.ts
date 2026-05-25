import { LISTING_FIELD_REGISTRY } from './listing-field-registry.js';

/** Parsed API error body from NestJS ValidationPipe / HttpException. */
export type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
  error?: string;
};

const TOP_LEVEL_LABELS: Record<string, string> = {
  kind: 'Тип объекта',
  regionId: 'Регион',
  blockId: 'Жилой комплекс',
  address: 'Адрес',
  lat: 'Широта',
  lng: 'Долгота',
  price: 'Цена',
  ownerUserId: 'Ответственный',
  ownerMode: 'Режим ответственного',
  publishAction: 'Действие публикации',
  apartment: 'Параметры квартиры',
  house: 'Параметры дома',
  land: 'Параметры участка',
  commercial: 'Коммерческие параметры',
  parking: 'Паркинг',
  mainPhotoUrl: 'Главное фото',
  extraPhotoUrls: 'Галерея',
  planUrl: 'Планировка',
  seller: 'Продавец',
  fullName: 'ФИО продавца',
  phone: 'Телефон продавца',
  email: 'Email продавца',
  payload: 'Данные формы',
  expectedVersion: 'Версия черновика',
  wizardStep: 'Шаг мастера',
};

const GROUP_LABELS: Record<string, string> = {
  apartment: 'квартиры',
  house: 'дома',
  land: 'участка',
  commercial: 'коммерции',
  parking: 'паркинга',
};

function buildFieldLabelMap(): Record<string, string> {
  const out: Record<string, string> = { ...TOP_LEVEL_LABELS };
  for (const fields of Object.values(LISTING_FIELD_REGISTRY)) {
    for (const f of fields) {
      const nested = `${f.group}.${f.key}`;
      if (!out[nested]) out[nested] = f.label;
      if (!out[f.key]) out[f.key] = f.label;
    }
  }
  return out;
}

const FIELD_LABELS = buildFieldLabelMap();

function labelForPath(path: string): string {
  const clean = path.replace(/^payload\.?/i, '').trim();
  if (FIELD_LABELS[clean]) return FIELD_LABELS[clean];
  const parts = clean.split('.');
  const last = parts[parts.length - 1] ?? clean;
  if (FIELD_LABELS[last]) return FIELD_LABELS[last];
  if (parts.length >= 2) {
    const nested = `${parts[parts.length - 2]}.${last}`;
    if (FIELD_LABELS[nested]) return FIELD_LABELS[nested];
  }
  return last;
}

/** Extract Nest `{ message }` from ApiError JSON body or plain text. */
export function extractApiMessages(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as ApiErrorBody;
    const m = parsed.message;
    if (Array.isArray(m)) return m.map((s) => String(s).trim()).filter(Boolean);
    if (typeof m === 'string' && m.trim()) return [m.trim()];
  } catch {
    /* plain text */
  }
  const t = raw.trim();
  return t ? [t] : [];
}

/**
 * Map one class-validator / Nest message to Russian UX copy.
 * Never surfaces internal paths like `payload.property`.
 */
export function translateValidationMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return 'Проверьте заполнение обязательных полей';
  if (/^[а-яА-ЯёЁ]/.test(trimmed) && !/property\s+\w+\s+should\s+not\s+exist/i.test(trimmed)) {
    return trimmed;
  }

  let m = trimmed
    .replace(/^payload\.?/i, '')
    .replace(/\bpayload\.property\b/gi, 'property')
    .trim();

  const forbidProperty = m.match(/property\s+(\w+)\s+should\s+not\s+exist/i);
  const forbidBare = m.match(/^(\w+(?:\.\w+)*)\s+should\s+not\s+exist/i);
  const forbidField = forbidProperty?.[1] ?? forbidBare?.[1];
  if (forbidField) {
    const field = labelForPath(forbidField);
    if (forbidField === 'seller' || forbidField.endsWith('.seller')) {
      return 'Поле «Продавец» недоступно для этого типа объекта';
    }
    return `Поле «${field}» не поддерживается для этого объекта`;
  }

  const nestedNum = m.match(/^([\w.]+)\s+must\s+be\s+(?:a\s+)?number/i);
  if (nestedNum) {
    const field = labelForPath(nestedNum[1] ?? '');
    if (nestedNum[1] === 'price' || nestedNum[1]?.endsWith('.price')) return 'Укажите корректную цену';
    return `Укажите корректное значение: ${field}`;
  }

  const nestedInt = m.match(/^([\w.]+)\s+must\s+be\s+an?\s+integer/i);
  if (nestedInt) {
    const field = labelForPath(nestedInt[1] ?? '');
    return `Укажите целое число: ${field}`;
  }

  const nestedStr = m.match(/^([\w.]+)\s+must\s+be\s+a\s+string/i);
  if (nestedStr) {
    const field = labelForPath(nestedStr[1] ?? '');
    return `Заполните поле: ${field}`;
  }

  const emptyMatch = m.match(/^([\w.]+)\s+should\s+not\s+be\s+empty/i);
  if (emptyMatch) {
    const field = labelForPath(emptyMatch[1] ?? '');
    return `Заполните обязательное поле: ${field}`;
  }

  const uuidMatch = m.match(/^([\w.]+)\s+must\s+be\s+a\s+UUID/i);
  if (uuidMatch) {
    const field = labelForPath(uuidMatch[1] ?? '');
    return `Некорректное значение: ${field}`;
  }

  const inMatch = m.match(/^([\w.]+)\s+must\s+be\s+one\s+of\s+the\s+following/i);
  if (inMatch) {
    const field = labelForPath(inMatch[1] ?? '');
    return `Выберите допустимое значение: ${field}`;
  }

  const minMatch = m.match(/^([\w.]+)\s+must\s+not\s+be\s+less\s+than\s+(\d+)/i);
  if (minMatch) {
    const field = labelForPath(minMatch[1] ?? '');
    return `${field}: значение слишком мало`;
  }

  const maxMatch = m.match(/^([\w.]+)\s+must\s+not\s+be\s+greater\s+than\s+(\d+)/i);
  if (maxMatch) {
    const field = labelForPath(maxMatch[1] ?? '');
    return `${field}: значение слишком велико`;
  }

  if (/^validation failed$/i.test(m) || /^bad request$/i.test(m)) {
    return 'Проверьте заполнение обязательных полей';
  }

  if (/^price must be/i.test(m)) return 'Укажите корректную цену';

  const genericProperty = m.match(/^property\s+(\w+)\s+should\s+not\s+exist/i);
  if (genericProperty) {
    return translateValidationMessage(`${genericProperty[1]} should not exist`);
  }

  return 'Проверьте заполнение обязательных полей';
}

export type FieldValidationError = { field: string; message: string };

/** Group translated messages by top-level / nested field path. */
export function parseApiValidationErrors(raw: string): FieldValidationError[] {
  const messages = extractApiMessages(raw);
  const seen = new Set<string>();
  const out: FieldValidationError[] = [];

  for (const msg of messages) {
    const translated = translateValidationMessage(msg);
    const pathMatch = msg.match(/^(?:payload\.?)?([\w]+(?:\.[\w]+)*)/);
    const field = pathMatch?.[1] ?? '_form';
    const key = `${field}:${translated}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ field, message: translated });
  }

  if (out.length === 0 && raw.trim()) {
    out.push({ field: '_form', message: translateValidationMessage(raw.trim()) });
  }

  return out;
}

/** Single-line Russian summary for toasts and wizard banners. */
export function formatApiValidationError(raw: string, status?: number): string {
  const messages = extractApiMessages(raw);
  if (messages.length === 0) {
    if (status === 403) return 'Недостаточно прав';
    if (status === 404) return 'Объект не найден';
    if (status === 409) return 'Данные изменились — обновите страницу';
    if (status === 401) return 'Сессия истекла — войдите снова';
    return 'Не удалось сохранить объект';
  }

  const translated = messages.map(translateValidationMessage);
  const unique = [...new Set(translated)];
  return unique.slice(0, 3).join(' · ');
}

/** Hint for wizard step index from validation field paths (0–4). */
export function wizardStepFromValidationFields(errors: FieldValidationError[]): number | undefined {
  const stepFields: Record<number, readonly string[]> = {
    0: ['kind'],
    1: ['regionId', 'blockId', 'address', 'lat', 'lng', 'price'],
    2: ['apartment', 'house', 'land', 'commercial', 'parking', 'mainPhotoUrl', 'extraPhotoUrls', 'planUrl'],
    3: ['ownerUserId', 'ownerMode', 'seller'],
    4: ['publishAction'],
  };

  for (const [stepStr, fields] of Object.entries(stepFields)) {
    const step = Number(stepStr);
    if (errors.some((e) => fields.some((f) => e.field === f || e.field.startsWith(`${f}.`)))) {
      return step;
    }
  }
  return undefined;
}

export { GROUP_LABELS, FIELD_LABELS };

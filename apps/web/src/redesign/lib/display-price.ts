/**
 * Single source of truth for price display across LiveGrid frontend.
 * Iteration 3 — price fallback normalization.
 */

export const MIN_REASONABLE_PRICE_RUB = 100_000;

export const PRICE_ON_REQUEST = 'Цена по запросу';

export const MORTGAGE_UNAVAILABLE = 'Ипотека недоступна';

export type PricePrefix = 'от' | 'до';

export type FormatDisplayPriceOptions = {
  prefix?: PricePrefix;
  /** Include trailing « ₽». Default true. */
  withCurrency?: boolean;
};

/** Parse API / model value into valid rubles or null. */
export function normalizePriceValue(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const n =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < MIN_REASONABLE_PRICE_RUB) return null;
  return n;
}

/** True when UI should show «Цена по запросу». */
export function isPriceHidden(value: string | number | null | undefined): boolean {
  return normalizePriceValue(value) === null;
}

function formatAmountRub(rub: number, withCurrency: boolean): string {
  const amount = Math.trunc(rub).toLocaleString('ru-RU');
  return withCurrency ? `${amount} ₽` : amount;
}

/**
 * Core formatter. Invalid → PRICE_ON_REQUEST.
 * Valid → exact ruble amount with thin spaces (optional prefix «от» / «до»).
 */
export function formatDisplayPrice(
  value: string | number | null | undefined,
  options?: FormatDisplayPriceOptions,
): string {
  const rub = normalizePriceValue(value);
  if (rub === null) return PRICE_ON_REQUEST;

  const withCurrency = options?.withCurrency !== false;
  const amount = formatAmountRub(rub, withCurrency);

  if (options?.prefix === 'от') return `от ${amount}`;
  if (options?.prefix === 'до') return `до ${amount}`;
  return amount;
}

/** Card / popup default: «от 8 283 750 ₽» or PRICE_ON_REQUEST. */
export function formatPriceFrom(
  value: string | number | null | undefined,
  withCurrency = true,
): string {
  return formatDisplayPrice(value, { prefix: 'от', withCurrency });
}

/** Map marker badge: «от 8.3 млн» style exact amount without ₽. */
export function formatMarkerPriceFrom(value: string | number | null | undefined): string {
  return formatDisplayPrice(value, { prefix: 'от', withCurrency: false });
}

/** Min–max range for tables and complex headers. */
export function formatPriceRangeDisplay(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const minRub = normalizePriceValue(min);
  const maxRub = normalizePriceValue(max);

  if (minRub === null && maxRub === null) return PRICE_ON_REQUEST;
  if (minRub !== null && maxRub !== null && Math.abs(minRub - maxRub) < 1) {
    return formatDisplayPrice(minRub);
  }
  if (minRub !== null && maxRub !== null) {
    return `${formatDisplayPrice(minRub, { prefix: 'от' })} — ${formatDisplayPrice(maxRub, { prefix: 'до' })}`;
  }
  if (minRub !== null) return formatDisplayPrice(minRub, { prefix: 'от' });
  if (maxRub !== null) return formatDisplayPrice(maxRub, { prefix: 'до' });
  return PRICE_ON_REQUEST;
}

/** Mortgage / installment label with unavailable fallback. */
export function formatMortgageLabel(value: string | null | undefined): string {
  const t = value?.trim();
  if (!t || t === '—' || /^undefined/i.test(t)) return MORTGAGE_UNAVAILABLE;
  return t;
}

/** aria-label when visible text is a fallback (screen readers). */
export function priceAriaLabel(displayText: string): string | undefined {
  if (displayText === PRICE_ON_REQUEST || displayText === '—') return PRICE_ON_REQUEST;
  return undefined;
}

/** Whether muted styling should apply (no valid price). */
export function isPriceFallbackText(displayText: string): boolean {
  return displayText === PRICE_ON_REQUEST;
}

/** Tailwind class for «Цена по запросу» (spec: #6b7280). */
export const PRICE_ON_REQUEST_CLASS = 'text-[#6b7280]';

/** Alias — canonical safe formatter. */
export const formatPriceSafe = formatDisplayPrice;

/** Alias — min/max range. */
export const formatPriceRangeSafe = formatPriceRangeDisplay;

/** Alias — valid price check. */
export function hasValidPrice(value: string | number | null | undefined): boolean {
  return normalizePriceValue(value) !== null;
}

/** Sort key: invalid prices → +Infinity (last when sorting asc). */
export function priceSortKey(value: string | number | null | undefined): number {
  const rub = normalizePriceValue(value);
  return rub ?? Number.POSITIVE_INFINITY;
}

/** Compare two prices; invalid sorts last in ascending order. */
export function compareByPrice(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: 'asc' | 'desc' = 'asc',
): number {
  const diff = priceSortKey(a) - priceSortKey(b);
  return dir === 'asc' ? diff : -diff;
}

/** ₽/m² — invalid price or area → PRICE_ON_REQUEST (no NaN). */
export function formatPricePerMeterSafe(
  price: string | number | null | undefined,
  area: string | number | null | undefined,
): string {
  const rub = normalizePriceValue(price);
  if (rub === null) return PRICE_ON_REQUEST;
  const areaN =
    typeof area === 'number'
      ? area
      : Number(String(area ?? '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(areaN) || areaN <= 0) return PRICE_ON_REQUEST;
  const ppm = Math.round(rub / areaN);
  if (!Number.isFinite(ppm) || ppm <= 0) return PRICE_ON_REQUEST;
  return `${ppm.toLocaleString('ru-RU')} ₽/м²`;
}

/** cn() helper: muted class when display text is on-request. */
export function priceFallbackClass(displayText: string, extra?: string): string {
  return isPriceFallbackText(displayText) ? PRICE_ON_REQUEST_CLASS : (extra ?? '');
}

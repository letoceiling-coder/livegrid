import type { ListingPresentationPayload } from './presentation.types';

export const PDF_BRAND_COLOR = '#2563EB';
export const PDF_TEXT_DARK = '#111827';
export const PDF_TEXT_MUTED = '#6B7280';

export type PdfAgentContact = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export function formatPdfFooterContact(contact: PdfAgentContact | null): string | null {
  if (!contact) return null;
  const parts = [contact.name, contact.phone, contact.email].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatPdfHeaderAgentLine(contact: PdfAgentContact | null): string | null {
  if (!contact) return null;
  const name = contact.name?.trim();
  const phone = contact.phone?.trim();
  if (name && phone) return `${name}\n${phone}`;
  return name ?? phone ?? contact.email?.trim() ?? null;
}

/** Yandex static map image (no API key). ll = lon,lat */
export function yandexStaticMapImageUrl(lat: number, lng: number, size: [number, number] = [500, 180]): string {
  const [w, h] = size;
  const ll = `${lng},${lat}`;
  const pt = `${lng},${lat},pm2rdm`;
  return `https://static-maps.yandex.ru/1.x/?lang=ru_RU&ll=${encodeURIComponent(ll)}&size=${w},${h}&z=15&l=map&pt=${encodeURIComponent(pt)}`;
}

export type PdfParamRow = { label: string; value: string };

export function listingPdfParamRows(p: ListingPresentationPayload): PdfParamRow[] {
  const rows: PdfParamRow[] = [{ label: 'Тип', value: p.kindLabel }];
  if (p.subtitle) rows.push({ label: 'Параметры', value: p.subtitle });
  if (p.price != null && Number.isFinite(p.price)) {
    rows.push({
      label: 'Цена',
      value: `${new Intl.NumberFormat('ru-RU').format(Math.trunc(p.price))} ₽`,
    });
  }
  if (p.region) rows.push({ label: 'Регион', value: p.region });
  if (p.district) rows.push({ label: 'Район', value: p.district });
  if (p.address) rows.push({ label: 'Адрес', value: p.address });
  if (p.builder) rows.push({ label: 'Продавец', value: p.builder });
  if (p.blockName) rows.push({ label: 'ЖК', value: p.blockName });
  return rows;
}

export function resolveGeoPoint(input: {
  lat?: unknown;
  lng?: unknown;
  blockLat?: unknown;
  blockLng?: unknown;
}): { lat: number; lng: number } | null {
  const lat = input.lat != null ? Number(input.lat) : input.blockLat != null ? Number(input.blockLat) : NaN;
  const lng = input.lng != null ? Number(input.lng) : input.blockLng != null ? Number(input.blockLng) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

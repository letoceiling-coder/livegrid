import { describe, expect, it } from 'vitest';
import { yandexMapWidgetSrc, yandexMapsHref } from '@/lib/contact-links';

describe('contact-links', () => {
  it('builds yandex maps href from address', () => {
    expect(yandexMapsHref({ address: 'Белгород ул. Есенина 9' })).toContain('yandex.ru/maps');
    expect(yandexMapsHref({ address: 'Белгород ул. Есенина 9' })).toContain('text=');
  });

  it('builds map widget src from coordinates', () => {
    const src = yandexMapWidgetSrc({ officeLat: '50.5956', officeLng: '36.5873' });
    expect(src).toContain('map-widget');
    expect(src).toContain('36.5873');
    expect(src).toContain('50.5956');
  });
});

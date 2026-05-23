import { describe, it, expect } from 'vitest';
import {
  CONVERSION_CTA,
  consultationTitle,
  phoneUnavailableMessage,
} from './conversion-cta';

describe('conversion-cta', () => {
  it('has unified labels', () => {
    expect(CONVERSION_CTA.consultation).toBe('Получить консультацию');
    expect(CONVERSION_CTA.phone).toBe('Позвонить');
    expect(CONVERSION_CTA.viewing).toBe('Записаться на просмотр');
  });

  it('resolves consultation title', () => {
    expect(
      consultationTitle({ surface: 'apartment', source: 'test', requestType: 'CALLBACK' }),
    ).toBe('Обратный звонок');
  });

  it('phone unavailable message is honest', () => {
    expect(phoneUnavailableMessage()).toContain('заявку');
  });
});

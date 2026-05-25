import { describe, expect, it } from 'vitest';
import {
  extractApiMessages,
  formatApiValidationError,
  parseApiValidationErrors,
  translateValidationMessage,
} from './api-validation.js';

describe('translateValidationMessage', () => {
  it('maps forbidNonWhitelisted seller on payload', () => {
    expect(translateValidationMessage('payload.property seller should not exist')).toBe(
      'Поле «Продавец» недоступно для этого типа объекта',
    );
  });

  it('maps price number errors', () => {
    expect(translateValidationMessage('price must be a number')).toBe('Укажите корректную цену');
  });

  it('maps nested apartment area', () => {
    expect(translateValidationMessage('apartment.areaTotal must be a number')).toBe(
      'Укажите корректное значение: Площадь квартиры, м²',
    );
  });

  it('passes through Russian API messages', () => {
    expect(translateValidationMessage('Регион не найден')).toBe('Регион не найден');
  });

  it('maps validation failed', () => {
    expect(translateValidationMessage('validation failed')).toBe(
      'Проверьте заполнение обязательных полей',
    );
  });
});

describe('formatApiValidationError', () => {
  it('parses JSON body with message array', () => {
    const raw = JSON.stringify({
      statusCode: 400,
      message: ['payload.property seller should not exist', 'price must be a number'],
    });
    expect(formatApiValidationError(raw, 400)).toBe(
      'Поле «Продавец» недоступно для этого типа объекта · Укажите корректную цену',
    );
  });
});

describe('extractApiMessages', () => {
  it('extracts from JSON', () => {
    const msgs = extractApiMessages(JSON.stringify({ message: 'validation failed' }));
    expect(msgs).toEqual(['validation failed']);
  });
});

describe('parseApiValidationErrors', () => {
  it('dedupes field errors', () => {
    const raw = JSON.stringify({ message: ['price must be a number', 'price must be a number'] });
    const errs = parseApiValidationErrors(raw);
    expect(errs).toHaveLength(1);
    expect(errs[0]?.field).toBe('price');
  });
});

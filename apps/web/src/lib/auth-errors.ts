/**
 * Localized auth error mapping — safe, no credential leaks.
 */

const AUTH_MESSAGE_RU: Record<string, string> = {
  'Invalid credentials': 'Неверный email или пароль',
  'Account is disabled': 'Аккаунт деактивирован',
  'User not found or disabled': 'Ошибка авторизации',
  'Invalid refresh token': 'Сессия истекла — войдите снова',
  'Session not found': 'Сессия истекла — войдите снова',
  'Refresh token mismatch': 'Сессия истекла — войдите снова',
  'User not found': 'Ошибка авторизации',
  'Текущий пароль неверный': 'Текущий пароль неверный',
  'Неверная подпись Telegram': 'Неверная подпись Telegram',
  'Устаревшие данные авторизации': 'Устаревшие данные авторизации',
};

/** Extract NestJS `{ message }` from ApiError body or plain text. */
export function extractApiMessage(raw: string): string {
  if (!raw?.trim()) return 'Ошибка авторизации';
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    const m = parsed.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string' && m.trim()) return m.trim();
  } catch {
    /* not JSON */
  }
  return raw.trim();
}

/** Map backend auth message to Russian UX copy. */
export function mapAuthErrorMessage(message: string, status?: number): string {
  const trimmed = message.trim();
  if (AUTH_MESSAGE_RU[trimmed]) return AUTH_MESSAGE_RU[trimmed];
  if (status === 401 && /invalid credentials/i.test(trimmed)) {
    return AUTH_MESSAGE_RU['Invalid credentials'];
  }
  if (status === 401) return 'Ошибка авторизации';
  if (status === 403) return 'Недостаточно прав';
  if (status === 409) return trimmed || 'Конфликт данных';
  if (status === 400) return trimmed || 'Проверьте введённые данные';
  if (/^[а-яА-ЯёЁ]/.test(trimmed)) return trimmed;
  return trimmed || 'Ошибка авторизации';
}

export function formatAuthError(raw: string, status?: number): string {
  return mapAuthErrorMessage(extractApiMessage(raw), status);
}

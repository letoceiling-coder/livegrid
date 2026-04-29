# LiveGrid Telegram Bot

Сервис Telegram-бота для LiveGrid (Node.js + Telegraf + Redis + webhook).

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и заполните значения.
2. Установите зависимости:
   - `npm install`
3. Для dev-режима:
   - `npm run dev`
4. Для production:
   - `npm run build`
   - `npm run start`

## Что уже реализовано

- Webhook-режим (`setWebhook` + HTTP endpoint).
- Redis-сессия пользователя с TTL 24 часа (`user:{telegram_id}`).
- Проверка подписки на канал (`getChatMember`) с блокировкой функционала.
- Главное меню `/start` и inline-кнопки.
- `/search` (город → тип → бюджет → результаты) + пагинация.
- `/catalog` + пагинация.
- `/favorites` (гость/авторизован) + пагинация.
- `/auth 123456` и `/logout`.
- `/contacts`.
- Единый fallback-текст ошибок API.
- Внутренний endpoint `/internal/notify` для уведомлений в канал.

## Важные URL

- Webhook endpoint: `${WEBHOOK_URL}${WEBHOOK_PATH}`
- Healthcheck: `GET /health`
- Internal notifications hook: `POST /internal/notify`

## Пример payload для /internal/notify

### Новая заявка

```json
{
  "type": "lead",
  "payload": {
    "requestId": "123",
    "name": "Иван",
    "phone": "+7 (900) 000-00-00",
    "kind": "Записаться на просмотр",
    "objectName": "ЖК 1-й Донской",
    "objectUrl": "https://livegrid.ru/complex/1-j-donskoj",
    "managerName": "Олег",
    "createdAt": "24.04.2026, 15:32"
  }
}
```

### Новая регистрация

```json
{
  "type": "registration",
  "payload": {
    "name": "Иван",
    "email": "ivan@example.com",
    "createdAt": "24.04.2026, 15:32"
  }
}
```

## Примечание по интеграции

Для полного соответствия ТЗ нужно на стороне backend сайта:

- Подтвердить контракт `POST /api/auth/telegram`.
- Подтвердить контракт `GET /api/v1/favorites`.
- Подключить вызов `/internal/notify` при новых заявках и регистрациях.
- Передавать `requestId` в уведомлениях заявок для кнопки "✅ Принять заявку".

import express from 'express';
import pinoHttpLib from 'pino-http';
import { bot } from './bot.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { acceptRequest } from './api.js';
const app = express();
const pinoHttp = pinoHttpLib;
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.post(config.WEBHOOK_PATH, (req, res) => {
    void bot.handleUpdate(req.body, res);
});
// Endpoint for site-side hooks (new lead / registration).
app.post('/internal/notify', async (req, res) => {
    try {
        if (config.INTERNAL_NOTIFY_TOKEN) {
            const token = req.header('x-internal-token') ?? '';
            if (token !== config.INTERNAL_NOTIFY_TOKEN) {
                res.status(401).json({ ok: false, error: 'unauthorized' });
                return;
            }
        }
        const { type, payload } = req.body;
        if (!type || !payload) {
            res.status(400).json({ ok: false, error: 'invalid_payload' });
            return;
        }
        if (!config.NOTIFICATION_CHANNEL_ID) {
            res.status(200).json({ ok: true, skipped: true });
            return;
        }
        if (type === 'lead') {
            const text = [
                '🔔 Новая заявка!',
                '',
                `👤 Имя: ${String(payload.name ?? '—')}`,
                `📱 Телефон: ${String(payload.phone ?? '—')}`,
                `💬 Тип: ${String(payload.kind ?? '—')}`,
                `🏗 Объект: ${String(payload.objectName ?? '—')}`,
                `🔗 ${String(payload.objectUrl ?? 'https://livegrid.ru')}`,
                '',
                `⏰ ${String(payload.createdAt ?? '')}`,
            ].join('\n');
            const requestId = String(payload.requestId ?? '');
            const managerName = String(payload.managerName ?? 'менеджер');
            const keyboard = requestId
                ? {
                    inline_keyboard: [
                        [{ text: 'Открыть объект', url: String(payload.objectUrl ?? 'https://livegrid.ru') }],
                        [{ text: '✅ Принять заявку', callback_data: `lead:accept:${requestId}:${managerName}` }],
                    ],
                }
                : undefined;
            await bot.telegram.sendMessage(config.NOTIFICATION_CHANNEL_ID, text, {
                reply_markup: keyboard,
            });
        }
        else if (type === 'registration') {
            const text = [
                '👤 Новый пользователь!',
                '',
                `Имя: ${String(payload.name ?? '—')}`,
                `Email: ${String(payload.email ?? '—')}`,
                `Дата: ${String(payload.createdAt ?? '')}`,
            ].join('\n');
            await bot.telegram.sendMessage(config.NOTIFICATION_CHANNEL_ID, text);
        }
        res.json({ ok: true });
    }
    catch (error) {
        logger.error({ error }, 'Failed to process internal notify');
        res.status(500).json({ ok: false });
    }
});
bot.action(/^lead:accept:([^:]+):(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Заявка принята');
    const requestId = ctx.match[1];
    const managerName = ctx.match[2];
    try {
        await acceptRequest(requestId, undefined, managerName);
        await ctx.editMessageReplyMarkup({
            inline_keyboard: [[{ text: `✅ Принято ${managerName}`, callback_data: 'noop:accepted' }]],
        });
    }
    catch {
        await ctx.answerCbQuery('Не удалось изменить статус', { show_alert: true });
    }
});
bot.action('noop:accepted', async (ctx) => {
    await ctx.answerCbQuery('Уже принято');
});
async function bootstrap() {
    await bot.telegram.setWebhook(`${config.WEBHOOK_URL}${config.WEBHOOK_PATH}`);
    app.listen(config.PORT, () => {
        logger.info({ port: config.PORT }, 'Telegram bot webhook server started');
    });
}
bootstrap().catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
});

import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const schema = z.object({
    BOT_TOKEN: z.string().min(1),
    API_BASE_URL: z.string().url(),
    NOTIFICATION_CHANNEL_ID: z.string().optional().default(''),
    REQUIRED_CHANNEL_ID: z.string().min(1),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().optional().default(''),
    WEBHOOK_URL: z.string().url(),
    WEBHOOK_PATH: z.string().min(1).default('/telegram/webhook'),
    PORT: z.coerce.number().int().positive().default(3100),
    CONTACT_EMAIL: z.string().optional().default(''),
    CONTACT_ADDRESS: z.string().optional().default(''),
    INTERNAL_NOTIFY_TOKEN: z.string().optional().default(''),
});
export const config = schema.parse(process.env);

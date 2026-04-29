import { Redis } from 'ioredis';
import { config } from './config.js';
const SESSION_TTL_SECONDS = 60 * 60 * 24;
export const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
});
function key(userId) {
    return `user:${userId}`;
}
export async function getSession(userId) {
    const raw = await redis.get(key(userId));
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export async function updateSession(userId, patch) {
    const current = await getSession(userId);
    const next = { ...current, ...patch };
    await redis.set(key(userId), JSON.stringify(next), 'EX', SESSION_TTL_SECONDS);
    return next;
}
export async function clearJwt(userId) {
    const current = await getSession(userId);
    delete current.jwt;
    await redis.set(key(userId), JSON.stringify(current), 'EX', SESSION_TTL_SECONDS);
}

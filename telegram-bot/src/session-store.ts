import { Redis } from 'ioredis';
import { config } from './config.js';
import type { UserSession } from './types.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24;

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

function key(userId: number): string {
  return `user:${userId}`;
}

export async function getSession(userId: number): Promise<UserSession> {
  const raw = await redis.get(key(userId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return {};
  }
}

export async function updateSession(userId: number, patch: Partial<UserSession>): Promise<UserSession> {
  const current = await getSession(userId);
  const next = { ...current, ...patch };
  await redis.set(key(userId), JSON.stringify(next), 'EX', SESSION_TTL_SECONDS);
  return next;
}

export async function clearJwt(userId: number): Promise<void> {
  const current = await getSession(userId);
  delete current.jwt;
  await redis.set(key(userId), JSON.stringify(current), 'EX', SESSION_TTL_SECONDS);
}

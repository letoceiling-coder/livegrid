import axios from 'axios';
import { config } from './config.js';
const api = axios.create({
    baseURL: config.API_BASE_URL,
    timeout: 10_000,
});
export async function fetchComplexes(params) {
    const response = await api.get('/search/complexes', { params });
    return response.data;
}
export async function fetchFavorites(jwt) {
    const response = await api.get('/favorites', {
        headers: { Authorization: `Bearer ${jwt}` },
    });
    return response.data;
}
export async function fetchContacts() {
    const response = await api.get('/contacts');
    return response.data;
}
export async function authByTelegramCode(code, telegramId) {
    const response = await axios.post(`${new URL(config.API_BASE_URL).origin}/api/auth/telegram`, {
        code,
        telegram_id: telegramId,
    }, { timeout: 10_000 });
    return response.data;
}
export async function refreshTelegramToken(telegramId) {
    const response = await axios.post(`${new URL(config.API_BASE_URL).origin}/api/auth/telegram/refresh`, { telegram_id: telegramId }, {
        headers: { 'x-telegram-bot-secret': config.JWT_SECRET || '' },
        timeout: 10_000,
    });
    return response.data;
}
export async function acceptRequest(requestId, jwt, acceptedByName) {
    const internalToken = config.INTERNAL_NOTIFY_TOKEN;
    const headers = {};
    if (jwt)
        headers.Authorization = `Bearer ${jwt}`;
    if (internalToken)
        headers['x-internal-token'] = internalToken;
    await axios.patch(`${new URL(config.API_BASE_URL).origin}/api/requests/${requestId}`, { status: 'accepted', acceptedByName }, { headers, timeout: 10_000 });
}

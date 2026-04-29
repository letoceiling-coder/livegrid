import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { config } from './config.js';
import axios from 'axios';
import { authByTelegramCode, fetchComplexes, fetchContacts, fetchFavorites, refreshTelegramToken } from './api.js';
import { renderComplexCard } from './formatters.js';
import {
  contactsKeyboard,
  mainMenuKeyboard,
  requireSubscriptionKeyboard,
  resultsKeyboard,
  searchBudgetKeyboard,
  searchCityKeyboard,
  searchTypeKeyboard,
} from './keyboards.js';
import { logger } from './logger.js';
import { getSession, clearJwt, updateSession } from './session-store.js';
import type { ComplexCard } from './types.js';

export const bot = new Telegraf(config.BOT_TOKEN);

async function guardSubscribed(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;
  try {
    const member = await ctx.telegram.getChatMember(config.REQUIRED_CHANNEL_ID, userId);
    if (['creator', 'administrator', 'member'].includes(member.status)) return true;
  } catch (error) {
    logger.warn({ error }, 'Subscription check failed');
  }
  await ctx.reply(
    `Чтобы пользоваться ботом, подпишитесь на наш канал:\n${config.REQUIRED_CHANNEL_ID}\n\nТам — новые ЖК, акции и полезные материалы.`,
    requireSubscriptionKeyboard(config.REQUIRED_CHANNEL_ID),
  );
  return false;
}

async function safeReply(ctx: Context, text: string): Promise<void> {
  try {
    await ctx.reply(text);
  } catch (error) {
    logger.error({ error }, 'Failed to send message');
  }
}

async function showMainMenu(ctx: Context): Promise<void> {
  const firstName = ctx.from?.first_name ?? 'друг';
  await ctx.reply(
    `Привет, ${firstName}! 👋\nЯ помогу найти недвижимость по всей России.\n\nЧто хотите сделать?`,
    mainMenuKeyboard,
  );
}

async function showContacts(ctx: Context): Promise<void> {
  const contacts = await fetchContacts();
  await ctx.reply(
    `📞 Контакты Live Grid\n\n☎️ ${contacts.phone}\n📧 ${contacts.email}\n📍 ${contacts.address}\n\nРежим работы: ${contacts.workHours}\n\n🌐 ${contacts.siteUrl.replace(/^https?:\/\//, '')}`,
    contactsKeyboard,
  );
}

async function showFavorites(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = await getSession(userId);
  if (!session.jwt) {
    await ctx.reply(
      'Чтобы видеть избранное, войдите на сайте:\nlivegrid.ru/login\n\nПосле входа свяжите аккаунт с ботом.',
      Markup.inlineKeyboard([
        [Markup.button.url('Войти на сайте', 'https://livegrid.ru/login')],
        [Markup.button.callback('🏠 Главное меню', 'menu:start')],
      ]),
    );
    return;
  }

  let jwt = session.jwt;
  let response;
  try {
    response = await fetchFavorites(jwt);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const refreshed = await refreshTelegramToken(userId);
      jwt = refreshed.token;
      response = await fetchFavorites(jwt);
      await updateSession(userId, { jwt });
    } else {
      throw error;
    }
  }
  await updateSession(userId, { page: 1, jwt });
  await sendComplexesList(ctx, response.data.slice(0, 5), (response.meta?.lastPage ?? 1) > 1, 'favorites');
}

async function sendComplexesList(
  ctx: Context,
  items: ComplexCard[],
  hasNext: boolean,
  mode: 'search' | 'catalog' | 'favorites',
): Promise<void> {
  if (items.length === 0) {
    await ctx.reply(
      mode === 'search'
        ? 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска'
        : mode === 'favorites'
          ? 'У вас пока нет избранных объектов. Перейдите в каталог'
          : 'Ничего не найдено.',
      resultsKeyboard(false, mode),
    );
    return;
  }

  for (const item of items) {
    const linkKeyboard = Markup.inlineKeyboard([
      [Markup.button.url('🔗 Подробнее на сайте', `https://livegrid.ru/complex/${item.slug}`)],
    ]);

    if (item.images?.[0]) {
      await ctx.replyWithPhoto(item.images[0], {
        caption: renderComplexCard(item),
        ...linkKeyboard,
      });
    } else {
      await ctx.reply(renderComplexCard(item), linkKeyboard);
    }
  }

  await ctx.reply('Навигация:', resultsKeyboard(hasNext, mode));
}

bot.use(async (ctx, next) => {
  try {
    const isStart = ctx.message && 'text' in ctx.message && ctx.message.text?.startsWith('/start');
    const isSubCheck = ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'sub:check';
    if (!isStart && !isSubCheck) {
      const ok = await guardSubscribed(ctx);
      if (!ok) return;
    }
    await next();
  } catch (error) {
    logger.error({ error }, 'Unhandled middleware error');
    await safeReply(ctx, 'Что-то пошло не так, попробуйте позже');
  }
});

bot.start(async (ctx) => {
  if (!(await guardSubscribed(ctx))) return;
  await updateSession(ctx.from.id, { step: 'idle', page: 1, catalogPage: 1, initialized: true });
  await showMainMenu(ctx);
});

bot.command('search', async (ctx) => {
  await updateSession(ctx.from.id, { step: 'search_city', page: 1 });
  await ctx.reply('В каком городе ищете?', searchCityKeyboard);
});

bot.command('catalog', async (ctx) => {
  await updateSession(ctx.from.id, { catalogPage: 1 });
  const response = await fetchComplexes({ perPage: 5, page: 1 });
  await sendComplexesList(ctx, response.data, (response.meta?.lastPage ?? 1) > 1, 'catalog');
});

bot.command('contacts', async (ctx) => {
  await showContacts(ctx);
});

bot.command('favorites', async (ctx) => {
  await showFavorites(ctx);
});

bot.command('logout', async (ctx) => {
  await clearJwt(ctx.from.id);
  await ctx.reply('Вы вышли из аккаунта');
});

bot.command('auth', async (ctx) => {
  const text = ctx.message.text.trim();
  const code = text.split(/\s+/)[1];
  if (!code || !/^\d{6}$/.test(code)) {
    await ctx.reply('Используйте формат: /auth 123456');
    return;
  }

  try {
    const auth = await authByTelegramCode(code, ctx.from.id);
    await updateSession(ctx.from.id, { jwt: auth.token });
    await ctx.reply('✅ Аккаунт успешно привязан! Теперь доступно избранное');
  } catch {
    await ctx.reply('Код недействителен. Запросите новый на сайте');
  }
});

bot.action('sub:check', async (ctx) => {
  await ctx.answerCbQuery();
  if (!(await guardSubscribed(ctx))) return;
  await showMainMenu(ctx);
});

bot.action('menu:start', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

bot.action('menu:search', async (ctx) => {
  await ctx.answerCbQuery();
  await updateSession(ctx.from!.id, { step: 'search_city', page: 1 });
  await ctx.reply('В каком городе ищете?', searchCityKeyboard);
});

bot.action('menu:catalog', async (ctx) => {
  await ctx.answerCbQuery();
  await updateSession(ctx.from!.id, { catalogPage: 1 });
  const response = await fetchComplexes({ perPage: 5, page: 1 });
  await sendComplexesList(ctx, response.data, (response.meta?.lastPage ?? 1) > 1, 'catalog');
});

bot.action('menu:favorites', async (ctx) => {
  await ctx.answerCbQuery();
  await showFavorites(ctx);
});

bot.action('menu:contacts', async (ctx) => {
  await ctx.answerCbQuery();
  await showContacts(ctx);
});

bot.action(/^search:city:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const city = (ctx.match[1] as 'moscow' | 'belgorod' | 'all') ?? 'all';
  await updateSession(ctx.from!.id, { city, step: 'search_type', page: 1 });
  await ctx.reply('Какой тип недвижимости?', searchTypeKeyboard);
});

bot.action(/^search:type:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = (ctx.match[1] as 'apartments' | 'houses' | 'land' | 'commercial') ?? 'apartments';
  await updateSession(ctx.from!.id, { type, step: 'search_budget', page: 1 });
  await ctx.reply('Укажите бюджет', searchBudgetKeyboard);
});

bot.action(/^search:budget:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const raw = ctx.match[1] as string;
  const priceMax = raw === 'none' || raw === 'any' ? undefined : Number(raw);
  const session = await updateSession(ctx.from!.id, { priceMax, page: 1, step: 'search_results' });

  const response = await fetchComplexes({
    city: session.city,
    type: session.type,
    priceMax: session.priceMax,
    perPage: 5,
    page: 1,
  });
  await sendComplexesList(ctx, response.data, (response.meta?.lastPage ?? 1) > 1, 'search');
});

bot.action('search:back:city', async (ctx) => {
  await ctx.answerCbQuery();
  await updateSession(ctx.from!.id, { step: 'search_city' });
  await ctx.reply('В каком городе ищете?', searchCityKeyboard);
});

bot.action('search:back:type', async (ctx) => {
  await ctx.answerCbQuery();
  await updateSession(ctx.from!.id, { step: 'search_type' });
  await ctx.reply('Какой тип недвижимости?', searchTypeKeyboard);
});

bot.action('search:next', async (ctx) => {
  await ctx.answerCbQuery();
  const session = await getSession(ctx.from!.id);
  const page = (session.page ?? 1) + 1;
  await updateSession(ctx.from!.id, { page });
  const response = await fetchComplexes({
    city: session.city,
    type: session.type,
    priceMax: session.priceMax,
    perPage: 5,
    page,
  });
  await sendComplexesList(ctx, response.data, (response.meta?.lastPage ?? 1) > page, 'search');
});

bot.action('catalog:next', async (ctx) => {
  await ctx.answerCbQuery();
  const session = await getSession(ctx.from!.id);
  const catalogPage = (session.catalogPage ?? 1) + 1;
  await updateSession(ctx.from!.id, { catalogPage });
  const response = await fetchComplexes({ perPage: 5, page: catalogPage });
  await sendComplexesList(ctx, response.data, (response.meta?.lastPage ?? 1) > catalogPage, 'catalog');
});

bot.action('favorites:next', async (ctx) => {
  await ctx.answerCbQuery();
  const session = await getSession(ctx.from!.id);
  if (!session.jwt) {
    await ctx.reply('Сессия истекла. Войдите заново через /auth');
    return;
  }
  const page = (session.page ?? 1) + 1;
  await updateSession(ctx.from!.id, { page });
  let jwt = session.jwt;
  let response;
  try {
    response = await fetchFavorites(jwt);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const refreshed = await refreshTelegramToken(ctx.from!.id);
      jwt = refreshed.token;
      response = await fetchFavorites(jwt);
      await updateSession(ctx.from!.id, { jwt });
    } else {
      throw error;
    }
  }
  const start = (page - 1) * 5;
  const items = response.data.slice(start, start + 5);
  const hasNext = response.data.length > start + 5;
  await sendComplexesList(ctx, items, hasNext, 'favorites');
});

bot.catch(async (error, ctx) => {
  logger.error({ error }, 'Bot-level error');
  await safeReply(ctx, 'Что-то пошло не так, попробуйте позже');
});

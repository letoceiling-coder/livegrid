import { Markup } from 'telegraf';

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔍 Найти объект', 'menu:search')],
  [Markup.button.callback('📋 Каталог ЖК', 'menu:catalog')],
  [Markup.button.callback('❤️ Избранное', 'menu:favorites')],
  [Markup.button.callback('📞 Контакты', 'menu:contacts')],
]);

export const searchCityKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🏙 Москва и МО', 'search:city:moscow'),
    Markup.button.callback('🏘 Белгород', 'search:city:belgorod'),
  ],
  [Markup.button.callback('🌍 Все города', 'search:city:all')],
  [Markup.button.callback('‹ Назад', 'menu:start')],
]);

export const searchTypeKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🏢 Квартира', 'search:type:apartments'),
    Markup.button.callback('🏡 Дом', 'search:type:houses'),
  ],
  [
    Markup.button.callback('🌱 Участок', 'search:type:land'),
    Markup.button.callback('🏪 Коммерция', 'search:type:commercial'),
  ],
  [Markup.button.callback('‹ Назад', 'search:back:city')],
]);

export const searchBudgetKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('до 5 млн', 'search:budget:5000000'),
    Markup.button.callback('5–10 млн', 'search:budget:10000000'),
  ],
  [
    Markup.button.callback('10–20 млн', 'search:budget:20000000'),
    Markup.button.callback('20–50 млн', 'search:budget:50000000'),
  ],
  [
    Markup.button.callback('от 50 млн', 'search:budget:none'),
    Markup.button.callback('Любой', 'search:budget:any'),
  ],
  [Markup.button.callback('‹ Назад', 'search:back:type')],
]);

export function resultsKeyboard(hasNext: boolean, mode: 'search' | 'catalog' | 'favorites') {
  const rows = [];
  if (hasNext) rows.push([Markup.button.callback('Следующие 5 →', `${mode}:next`)]);
  if (mode === 'search') rows.push([Markup.button.callback('🔄 Новый поиск', 'menu:search')]);
  if (mode === 'favorites') rows.push([Markup.button.callback('📋 Каталог', 'menu:catalog')]);
  rows.push([Markup.button.callback('🏠 Главное меню', 'menu:start')]);
  return Markup.inlineKeyboard(rows);
}

export const requireSubscriptionKeyboard = (channel: string) =>
  Markup.inlineKeyboard([
    [Markup.button.url('Подписаться', `https://t.me/${channel.replace('@', '')}`)],
    [Markup.button.callback('Я подписался ✓', 'sub:check')],
  ]);

export const contactsKeyboard = Markup.inlineKeyboard([
  [Markup.button.url('📱 Позвонить', 'tel:+79045393434')],
  [Markup.button.url('🌐 Перейти на сайт', 'https://livegrid.ru')],
  [Markup.button.url('💬 Написать нам', 'https://livegrid.ru/contacts')],
  [Markup.button.callback('🏠 Главное меню', 'menu:start')],
]);

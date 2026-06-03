/** Task 7.5 — defaults when CMS contacts are empty */
export const FOOTER_DEFAULT_ADDRESS =
  'Белгород, ул. Есенина\n9 корп. 3, оф. 309\nБЦ «Есенин»';

export const FOOTER_DEFAULT_MAPS_URL =
  'https://yandex.ru/maps/?text=Белгород+ул.+Есенина+9';

export const FOOTER_DEFAULT_PHONE = '+7 (901) 990-99-93';
export const FOOTER_DEFAULT_EMAIL = 'livegrid@mail.ru';
export const FOOTER_DEFAULT_HOURS = 'ПН-ПТ 9:00–18:00';

export const FOOTER_CATALOG_LINKS = [
  { label: 'Новостройки', to: '/catalog?type=apartments&market=new' },
  { label: 'Вторичное жильё', to: '/catalog?type=apartments&market=secondary' },
  { label: 'Дома и участки', to: '/catalog?type=houses' },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { label: 'О нас', to: '/about' },
  { label: 'Наши агенты', to: '/agents' },
  { label: 'Контакты', to: '/contacts' },
] as const;

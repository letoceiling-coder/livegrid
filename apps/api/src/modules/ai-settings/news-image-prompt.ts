/** Strip HTML for DALL-E prompt context. */
export function stripHtmlForImagePrompt(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Task 24 — DALL-E 3 prompt from news title/body. */
export function buildNewsCoverImagePrompt(input: { title?: string; body?: string }): string {
  const title = (input.title ?? '').trim().slice(0, 200);
  const bodyPlain = stripHtmlForImagePrompt(input.body ?? '').slice(0, 600);
  const context = [
    title ? `Заголовок: ${title}` : '',
    bodyPlain ? `Содержание: ${bodyPlain}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const description =
    context.length > 0
      ? context
      : 'Современные новостройки и городская застройка в России';

  return [
    'Сгенерируй фотореалистичную обложку для новости о недвижимости по описанию:',
    description,
    '',
    'Стиль: редакционное фото для новостного сайта, дневной свет, широкий кадр.',
    'Без текста, логотипов и водяных знаков на изображении.',
  ].join('\n');
}

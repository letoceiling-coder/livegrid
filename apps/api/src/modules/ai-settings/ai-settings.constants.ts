export const DEFAULT_NEWS_SYSTEM_PROMPT = `Ты редактор новостей по недвижимости.
Перепиши новость своими словами.
Сохрани факты.
Убери рекламный тон.
Сделай текст читаемым и нейтральным.
Верни только готовый текст без пояснений.`;

export const AI_PROVIDER_MODELS: Record<string, string[]> = {
  OPENAI: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4o'],
  OPENROUTER: [
    'google/gemini-2.0-flash-lite',
    'openai/gpt-4.1-mini',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
  ],
  GEMINI: ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'],
  CLAUDE: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
};

/** DALL-E models for news cover generation (OpenAI Images API). */
export const DALL_E_IMAGE_MODELS = ['dall-e-3', 'dall-e-2'] as const;

export const DALL_E_IMAGE_SIZES: Record<(typeof DALL_E_IMAGE_MODELS)[number], string[]> = {
  'dall-e-3': ['1024x1024', '1792x1024', '1024x1792'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
};

export const DEFAULT_IMAGE_MODEL = 'dall-e-3';
export const DEFAULT_IMAGE_SIZE = '1792x1024';
export const DEFAULT_IMAGE_TIMEOUT_MS = 120_000;

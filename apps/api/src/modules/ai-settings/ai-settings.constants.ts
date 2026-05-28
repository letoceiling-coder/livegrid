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

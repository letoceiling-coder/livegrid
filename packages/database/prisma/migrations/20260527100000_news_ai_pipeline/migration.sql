-- News AI pipeline: workflow status, AI provider settings, audit logs

CREATE TYPE "news_workflow_status" AS ENUM ('NEW', 'REWRITTEN', 'DRAFT', 'PUBLISHED', 'ERROR');
CREATE TYPE "ai_provider_kind" AS ENUM ('OPENAI', 'OPENROUTER', 'GEMINI', 'CLAUDE');

ALTER TABLE "news" ADD COLUMN "workflow_status" "news_workflow_status" NOT NULL DEFAULT 'NEW';
ALTER TABLE "news" ADD COLUMN "original_text" TEXT;
ALTER TABLE "news" ADD COLUMN "rewritten_text" TEXT;
ALTER TABLE "news" ADD COLUMN "telegram_post_id" VARCHAR(64);
ALTER TABLE "news" ADD COLUMN "telegram_channel_id" INTEGER;
ALTER TABLE "news" ADD COLUMN "ai_provider" VARCHAR(32);
ALTER TABLE "news" ADD COLUMN "ai_model" VARCHAR(128);
ALTER TABLE "news" ADD COLUMN "rewrite_tokens" INTEGER;
ALTER TABLE "news" ADD COLUMN "rewrite_cost_usd" DECIMAL(12,6);
ALTER TABLE "news" ADD COLUMN "rewrite_duration_ms" INTEGER;
ALTER TABLE "news" ADD COLUMN "error_message" TEXT;
ALTER TABLE "news" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "news" ADD COLUMN "seo_title" VARCHAR(512);
ALTER TABLE "news" ADD COLUMN "seo_description" TEXT;
ALTER TABLE "news" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "news_telegram_channels" ADD COLUMN "avatar_url" VARCHAR(512);
ALTER TABLE "news_telegram_channels" ADD COLUMN "last_sync_at" TIMESTAMP(3);
ALTER TABLE "news_telegram_channels" ADD COLUMN "posts_imported_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "news_telegram_channels" ALTER COLUMN "publish_on_import" SET DEFAULT false;

CREATE INDEX "news_workflow_status_idx" ON "news"("workflow_status");
CREATE INDEX "news_deleted_at_idx" ON "news"("deleted_at");

ALTER TABLE "news" ADD CONSTRAINT "news_telegram_channel_id_fkey"
  FOREIGN KEY ("telegram_channel_id") REFERENCES "news_telegram_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "news_telegram_channel_id_telegram_post_id_key"
  ON "news"("telegram_channel_id", "telegram_post_id");

-- Backfill workflow status from existing publish state
UPDATE "news" SET "workflow_status" = 'PUBLISHED' WHERE "is_published" = true;
UPDATE "news" SET "workflow_status" = 'DRAFT' WHERE "is_published" = false AND "body" IS NOT NULL;
UPDATE "news" SET "original_text" = "body" WHERE "source" = 'TELEGRAM_CHANNEL' AND "original_text" IS NULL;

CREATE TABLE "ai_provider_settings" (
  "id" SERIAL NOT NULL,
  "provider" "ai_provider_kind" NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "api_key_enc" TEXT,
  "default_model" VARCHAR(128),
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "max_tokens" INTEGER NOT NULL DEFAULT 2048,
  "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
  "retry_count" INTEGER NOT NULL DEFAULT 2,
  "system_prompt" TEXT NOT NULL,
  "total_cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_provider_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_provider_settings_provider_key" ON "ai_provider_settings"("provider");

CREATE TABLE "news_ai_global_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "active_provider" "ai_provider_kind",
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "news_ai_global_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_rewrite_logs" (
  "id" SERIAL NOT NULL,
  "news_id" INTEGER NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "model" VARCHAR(128) NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "cost_usd" DECIMAL(12,6),
  "duration_ms" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_rewrite_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "news_rewrite_logs_news_id_idx" ON "news_rewrite_logs"("news_id");

ALTER TABLE "news_rewrite_logs" ADD CONSTRAINT "news_rewrite_logs_news_id_fkey"
  FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "news_publish_logs" (
  "id" SERIAL NOT NULL,
  "news_id" INTEGER NOT NULL,
  "target" VARCHAR(32) NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_publish_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "news_publish_logs_news_id_idx" ON "news_publish_logs"("news_id");

ALTER TABLE "news_publish_logs" ADD CONSTRAINT "news_publish_logs_news_id_fkey"
  FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default AI provider rows
INSERT INTO "ai_provider_settings" ("provider", "is_enabled", "default_model", "system_prompt", "updated_at")
VALUES
  ('OPENAI', false, 'gpt-4.1-mini', 'Ты редактор новостей по недвижимости.
Перепиши новость своими словами.
Сохрани факты.
Убери рекламный тон.
Сделай текст читаемым и нейтральным.
Верни только готовый текст без пояснений.', CURRENT_TIMESTAMP),
  ('OPENROUTER', false, 'openai/gpt-4.1-mini', 'Ты редактор новостей по недвижимости.
Перепиши новость своими словами.
Сохрани факты.
Убери рекламный тон.
Сделай текст читаемым и нейтральным.
Верни только готовый текст без пояснений.', CURRENT_TIMESTAMP),
  ('GEMINI', false, 'gemini-2.0-flash-lite', 'Ты редактор новостей по недвижимости.
Перепиши новость своими словами.
Сохрани факты.
Убери рекламный тон.
Сделай текст читаемым и нейтральным.
Верни только готовый текст без пояснений.', CURRENT_TIMESTAMP),
  ('CLAUDE', false, 'claude-3-5-haiku-latest', 'Ты редактор новостей по недвижимости.
Перепиши новость своими словами.
Сохрани факты.
Убери рекламный тон.
Сделай текст читаемым и нейтральным.
Верни только готовый текст без пояснений.', CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;

INSERT INTO "news_ai_global_settings" ("id", "active_provider", "updated_at")
VALUES (1, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

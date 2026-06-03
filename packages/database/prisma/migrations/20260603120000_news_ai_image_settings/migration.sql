-- Admin-configurable DALL-E settings for news covers (no env vars)

ALTER TABLE "news_ai_global_settings"
  ADD COLUMN IF NOT EXISTS "image_generation_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "image_model" VARCHAR(64) NOT NULL DEFAULT 'dall-e-3',
  ADD COLUMN IF NOT EXISTS "image_size" VARCHAR(32) NOT NULL DEFAULT '1792x1024',
  ADD COLUMN IF NOT EXISTS "image_timeout_ms" INTEGER NOT NULL DEFAULT 120000;

INSERT INTO "news_ai_global_settings" ("id", "updated_at")
VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Iter 52: saved searches, user notifications, browse history, favorites intelligence (additive)

CREATE TYPE "UserNotificationType" AS ENUM (
  'SAVED_SEARCH_MATCH',
  'PRICE_DROP',
  'FAVORITE_UPDATE',
  'LISTING_RESTORED'
);

ALTER TABLE "favorites"
  ADD COLUMN IF NOT EXISTS "collection_id" UUID,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "last_viewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "price_at_save" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "last_notified_price" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "favorites_collection_id_idx" ON "favorites"("collection_id");

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "user_collections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "saved_searches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "params_json" JSONB NOT NULL,
  "region_id" INTEGER,
  "geo_context" JSONB,
  "query_hash" TEXT NOT NULL,
  "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
  "alert_new_matches" BOOLEAN NOT NULL DEFAULT true,
  "alert_price_drop" BOOLEAN NOT NULL DEFAULT true,
  "alert_restored" BOOLEAN NOT NULL DEFAULT true,
  "last_match_at" TIMESTAMP(3),
  "last_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_searches_user_id_query_hash_key"
  ON "saved_searches"("user_id", "query_hash");
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");
CREATE INDEX "saved_searches_alerts_enabled_last_checked_at_idx"
  ON "saved_searches"("alerts_enabled", "last_checked_at");

ALTER TABLE "saved_searches"
  ADD CONSTRAINT "saved_searches_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_searches"
  ADD CONSTRAINT "saved_searches_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" "UserNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "read_at" TIMESTAMP(3),
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notifications_user_id_dedupe_key_key"
  ON "user_notifications"("user_id", "dedupe_key");
CREATE INDEX "user_notifications_user_id_read_at_created_at_idx"
  ON "user_notifications"("user_id", "read_at", "created_at");

ALTER TABLE "user_notifications"
  ADD CONSTRAINT "user_notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_browse_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "entity_kind" TEXT NOT NULL,
  "entity_id" INTEGER NOT NULL,
  "title" TEXT,
  "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_browse_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_browse_history_user_id_entity_kind_entity_id_key"
  ON "user_browse_history"("user_id", "entity_kind", "entity_id");
CREATE INDEX "user_browse_history_user_id_viewed_at_idx"
  ON "user_browse_history"("user_id", "viewed_at");

ALTER TABLE "user_browse_history"
  ADD CONSTRAINT "user_browse_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

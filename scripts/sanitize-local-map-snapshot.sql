-- Post-restore sanitization for LOCAL lg_development ONLY.
-- Usage: psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1 -f scripts/sanitize-local-map-snapshot.sql
-- Then: cd ~/lg && set -a && source .env && set +a && pnpm db:seed

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'lg_development' THEN
    RAISE EXCEPTION 'Refusing to sanitize: expected lg_development, got %', current_database();
  END IF;
END $$;

UPDATE site_settings SET value = '' WHERE key IN (
  'telegram_bot_token',
  'telegram_notify_chat_id',
  'telegram_login_bot_username',
  'tg_news_mtproto_session'
);

TRUNCATE TABLE
  telegram_auth_codes,
  sessions,
  audit_events,
  requests,
  telegram_notify_access_requests,
  telegram_notify_recipients,
  favorites,
  user_collections,
  user_collection_items,
  import_batches
RESTART IDENTITY CASCADE;

DELETE FROM users;

UPDATE sellers SET
  full_name = CASE WHEN full_name IS NOT NULL THEN 'Seller #' || id::text ELSE NULL END,
  phone = NULL,
  phone_alt = NULL,
  email = NULL,
  notes = NULL,
  created_by_id = NULL,
  updated_by_id = NULL;

REFRESH MATERIALIZED VIEW catalog_apartment_active_mv;

SELECT 'sanitize complete — run pnpm db:seed for local admin' AS next_step;

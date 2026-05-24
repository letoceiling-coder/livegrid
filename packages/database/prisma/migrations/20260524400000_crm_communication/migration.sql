-- Iter 54: CRM buyer ↔ agent communication foundation (additive)

ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'BUYER_REPLY';
ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'CALLBACK_OVERDUE';
ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'MANAGER_MENTIONED';
ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'UNREAD_CONVERSATION';

CREATE TYPE "CrmThreadType" AS ENUM ('LISTING_INQUIRY', 'COMPLEX_INQUIRY', 'SUPPORT', 'INTERNAL');
CREATE TYPE "CrmMessageType" AS ENUM ('TEXT', 'SYSTEM', 'NOTE', 'CONTACT_ATTEMPT', 'CALLBACK_SCHEDULED');
CREATE TYPE "CrmMessageVisibility" AS ENUM ('INTERNAL', 'BUYER_VISIBLE', 'MANAGER_ONLY');
CREATE TYPE "CrmParticipantRole" AS ENUM ('BUYER', 'AGENT', 'MANAGER', 'SYSTEM');

ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "interaction_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "crm_threads" (
  "id" SERIAL NOT NULL,
  "thread_type" "CrmThreadType" NOT NULL,
  "request_id" INTEGER,
  "listing_id" INTEGER,
  "block_id" INTEGER,
  "buyer_user_id" UUID,
  "buyer_token" VARCHAR(64),
  "subject" TEXT,
  "message_count" INTEGER NOT NULL DEFAULT 0,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_threads_request_id_key" ON "crm_threads"("request_id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_threads_buyer_token_key" ON "crm_threads"("buyer_token");
CREATE INDEX IF NOT EXISTS "crm_threads_last_message_at_idx" ON "crm_threads"("last_message_at");
CREATE INDEX IF NOT EXISTS "crm_threads_buyer_user_id_idx" ON "crm_threads"("buyer_user_id");
CREATE INDEX IF NOT EXISTS "crm_threads_listing_id_idx" ON "crm_threads"("listing_id");
CREATE INDEX IF NOT EXISTS "crm_threads_block_id_idx" ON "crm_threads"("block_id");

ALTER TABLE "crm_threads"
  ADD CONSTRAINT "crm_threads_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_threads"
  ADD CONSTRAINT "crm_threads_buyer_user_id_fkey"
  FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "crm_thread_participants" (
  "id" SERIAL NOT NULL,
  "thread_id" INTEGER NOT NULL,
  "user_id" UUID,
  "buyer_token" VARCHAR(64),
  "role" "CrmParticipantRole" NOT NULL,
  "last_read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crm_thread_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_thread_participants_thread_id_user_id_key"
  ON "crm_thread_participants"("thread_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_thread_participants_thread_id_buyer_token_key"
  ON "crm_thread_participants"("thread_id", "buyer_token");
CREATE INDEX IF NOT EXISTS "crm_thread_participants_user_id_last_read_at_idx"
  ON "crm_thread_participants"("user_id", "last_read_at");

ALTER TABLE "crm_thread_participants"
  ADD CONSTRAINT "crm_thread_participants_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "crm_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_thread_participants"
  ADD CONSTRAINT "crm_thread_participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "crm_messages" (
  "id" SERIAL NOT NULL,
  "thread_id" INTEGER NOT NULL,
  "type" "CrmMessageType" NOT NULL,
  "visibility" "CrmMessageVisibility" NOT NULL DEFAULT 'INTERNAL',
  "body" TEXT NOT NULL,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "actor_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crm_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crm_messages_thread_id_created_at_idx"
  ON "crm_messages"("thread_id", "created_at");

ALTER TABLE "crm_messages"
  ADD CONSTRAINT "crm_messages_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "crm_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_messages"
  ADD CONSTRAINT "crm_messages_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

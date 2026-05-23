-- CRM operational notifications (Iter 33)

CREATE TYPE "CrmNotificationType" AS ENUM (
  'NEW_ASSIGNED_LEAD',
  'OVERDUE_LEAD',
  'STALE_LEAD',
  'NEW_NOTE',
  'STATUS_CHANGED',
  'VIEWING_REMINDER',
  'REASSIGNED',
  'TG_CLAIMED'
);

CREATE TYPE "CrmNotificationPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TABLE "crm_notifications" (
  "id" SERIAL NOT NULL,
  "type" "CrmNotificationType" NOT NULL,
  "priority" "CrmNotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "recipient_id" UUID NOT NULL,
  "request_id" INTEGER,
  "actor_id" UUID,
  "source_event_id" INTEGER,
  "dedupe_key" VARCHAR(320) NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_notifications_recipient_id_dedupe_key_key"
  ON "crm_notifications"("recipient_id", "dedupe_key");

CREATE INDEX "crm_notifications_recipient_id_read_at_created_at_idx"
  ON "crm_notifications"("recipient_id", "read_at", "created_at");

CREATE INDEX "crm_notifications_request_id_idx" ON "crm_notifications"("request_id");

ALTER TABLE "crm_notifications"
  ADD CONSTRAINT "crm_notifications_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_notifications"
  ADD CONSTRAINT "crm_notifications_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_notifications"
  ADD CONSTRAINT "crm_notifications_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_notifications"
  ADD CONSTRAINT "crm_notifications_source_event_id_fkey"
  FOREIGN KEY ("source_event_id") REFERENCES "request_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

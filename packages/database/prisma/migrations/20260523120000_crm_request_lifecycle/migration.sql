-- CRM lead lifecycle + request timeline (Iter 31)

ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CONTACTED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'VIEWING_SCHEDULED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATION';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'SUCCESS';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'SPAM';

CREATE TYPE "RequestEventType" AS ENUM (
  'CREATED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'CONTACTED',
  'VIEWING_SCHEDULED'
);

CREATE TABLE "request_events" (
  "id" SERIAL NOT NULL,
  "request_id" INTEGER NOT NULL,
  "type" "RequestEventType" NOT NULL,
  "from_status" "RequestStatus",
  "to_status" "RequestStatus",
  "note" TEXT,
  "actor_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_events_request_id_created_at_idx" ON "request_events"("request_id", "created_at");

ALTER TABLE "request_events"
  ADD CONSTRAINT "request_events_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_events"
  ADD CONSTRAINT "request_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "requests_status_created_at_idx" ON "requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "requests_assigned_to_status_idx" ON "requests"("assigned_to", "status");

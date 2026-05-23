-- CRM last activity + SLA operational sorting (Iter 32)

ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "requests" r
SET "last_activity_at" = COALESCE(
  (SELECT MAX(e."created_at") FROM "request_events" e WHERE e."request_id" = r."id"),
  r."updated_at",
  r."created_at"
);

CREATE INDEX IF NOT EXISTS "requests_last_activity_at_idx" ON "requests"("last_activity_at");

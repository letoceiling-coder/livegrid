-- Iter 44: manual listing ownership + visibility lifecycle (additive, non-destructive)

CREATE TYPE "ListingVisibility" AS ENUM ('PUBLIC', 'HIDDEN', 'ARCHIVED', 'DRAFT');

ALTER TABLE "listings"
  ADD COLUMN "visibility" "ListingVisibility",
  ADD COLUMN "owner_user_id" UUID,
  ADD COLUMN "archived_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_activity_at" TIMESTAMPTZ(3);

-- Backfill visibility from legacy status + is_published
UPDATE "listings" SET "visibility" = 'DRAFT' WHERE "status" = 'DRAFT';
UPDATE "listings" SET "visibility" = 'ARCHIVED' WHERE "status" IN ('INACTIVE', 'SOLD') AND "visibility" IS NULL;
UPDATE "listings" SET "visibility" = 'HIDDEN' WHERE "is_published" = false AND "status" IN ('ACTIVE', 'RESERVED') AND "visibility" IS NULL;
UPDATE "listings" SET "visibility" = 'PUBLIC' WHERE "visibility" IS NULL;

-- Backfill owner from external_id prefix manual-{uuid}-
UPDATE "listings"
SET "owner_user_id" = (regexp_match("external_id", '^manual-([0-9a-f-]{36})-'))[1]::uuid
WHERE "data_source" = 'MANUAL'
  AND "external_id" ~ '^manual-[0-9a-f-]{36}-'
  AND "owner_user_id" IS NULL;

UPDATE "listings" SET "archived_at" = "updated_at" WHERE "visibility" = 'ARCHIVED' AND "archived_at" IS NULL;
UPDATE "listings" SET "last_activity_at" = "updated_at" WHERE "last_activity_at" IS NULL;

ALTER TABLE "listings"
  ALTER COLUMN "visibility" SET NOT NULL,
  ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC',
  ALTER COLUMN "last_activity_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "listings_visibility_idx" ON "listings"("visibility");
CREATE INDEX "listings_owner_user_id_idx" ON "listings"("owner_user_id");
CREATE INDEX "listings_last_activity_at_idx" ON "listings"("last_activity_at");

ALTER TABLE "listings"
  ADD CONSTRAINT "listings_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

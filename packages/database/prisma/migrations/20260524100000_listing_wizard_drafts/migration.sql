-- Iter 50: server-side wizard drafts + moderation visibility (additive)

ALTER TYPE "ListingVisibility" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "ListingVisibility" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "moderation_note" TEXT;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "draft_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "listing_wizard_snapshots" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "wizard_step" INTEGER NOT NULL DEFAULT 0,
    "is_pending_revision" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" UUID,

    CONSTRAINT "listing_wizard_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_wizard_snapshots_listing_id_key" ON "listing_wizard_snapshots"("listing_id");
CREATE INDEX IF NOT EXISTS "listing_wizard_snapshots_updated_at_idx" ON "listing_wizard_snapshots"("updated_at");

CREATE TABLE IF NOT EXISTS "listing_edit_history" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "summary" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_edit_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "listing_edit_history_listing_id_created_at_idx" ON "listing_edit_history"("listing_id", "created_at" DESC);

ALTER TABLE "listing_wizard_snapshots" ADD CONSTRAINT "listing_wizard_snapshots_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_wizard_snapshots" ADD CONSTRAINT "listing_wizard_snapshots_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "listing_edit_history" ADD CONSTRAINT "listing_edit_history_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_edit_history" ADD CONSTRAINT "listing_edit_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Iter 22: additive human review governance for legacy geo rows (no listing geo writes)

DO $$ BEGIN
  CREATE TYPE "ListingGeoReviewStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED_AS_EXACT',
    'APPROVED_AS_BUILDING',
    'APPROVED_AS_BLOCK',
    'MARKED_INVALID',
    'SKIPPED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "listing_geo_review_decisions" (
  "id" SERIAL NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "review_status" "ListingGeoReviewStatus" NOT NULL,
  "reviewer" VARCHAR(128) NOT NULL,
  "decision_reason" TEXT,
  "before_lat" DECIMAL(10,8),
  "before_lng" DECIMAL(11,8),
  "proposed_lat" DECIMAL(10,8),
  "proposed_lng" DECIMAL(11,8),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "listing_geo_review_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "listing_geo_review_decisions_listing_id_created_at_idx"
  ON "listing_geo_review_decisions"("listing_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "listing_geo_review_decisions_status_idx"
  ON "listing_geo_review_decisions"("review_status");

-- Legacy coord candidates for human review (read path optimization)
CREATE INDEX IF NOT EXISTS "listings_legacy_geo_review_idx"
  ON "listings"("region_id", "id")
  WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL AND "geo_source" IS NULL;

DO $$ BEGIN
  ALTER TABLE "listing_geo_review_decisions"
    ADD CONSTRAINT "listing_geo_review_decisions_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

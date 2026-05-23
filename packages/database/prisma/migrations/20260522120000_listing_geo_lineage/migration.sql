-- Iter 20: additive listing geo lineage (nullable, no data migration, no CHECK enforcement)

DO $$ BEGIN
  CREATE TYPE "GeoSource" AS ENUM (
    'MANUAL_EXACT',
    'FEED_EXACT',
    'BUILDING_INHERIT',
    'BLOCK_INHERIT',
    'GEOCODE_VERIFIED',
    'GEOCODE_APPROXIMATE',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GeoQuality" AS ENUM (
    'EXACT',
    'BUILDING_CENTROID',
    'BLOCK_CENTROID',
    'MISSING',
    'INVALID'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GeoEntityKind" AS ENUM (
    'BUILDING',
    'BLOCK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reconcile schema drift: listing lat/lng may exist without prior migration
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10,8);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "lng" DECIMAL(11,8);

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_source" "GeoSource";
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_quality" "GeoQuality";
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_confidence" DECIMAL(4,3);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_resolved_at" TIMESTAMPTZ(3);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_entity_id" INTEGER;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_entity_kind" "GeoEntityKind";
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_resolution_version" INTEGER;

CREATE INDEX IF NOT EXISTS "listings_geo_quality_region_id_idx"
  ON "listings"("geo_quality", "region_id");

CREATE INDEX IF NOT EXISTS "listings_geo_source_idx"
  ON "listings"("geo_source");

CREATE INDEX IF NOT EXISTS "listings_geo_entity_idx"
  ON "listings"("geo_entity_kind", "geo_entity_id");

-- Iter 23: staging materialization rollback snapshots (no listing changes in migration)

CREATE TABLE IF NOT EXISTS "listing_geo_materialization_snapshots" (
  "id" SERIAL NOT NULL,
  "run_id" VARCHAR(36) NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "before_lat" DECIMAL(10,8),
  "before_lng" DECIMAL(11,8),
  "before_geo_source" "GeoSource",
  "before_geo_quality" "GeoQuality",
  "before_geo_confidence" DECIMAL(4,3),
  "before_geo_entity_id" INTEGER,
  "before_geo_entity_kind" "GeoEntityKind",
  "before_geo_resolution_version" INTEGER,
  "before_geo_resolved_at" TIMESTAMPTZ(3),
  "after_lat" DECIMAL(10,8),
  "after_lng" DECIMAL(11,8),
  "after_geo_source" "GeoSource",
  "after_geo_quality" "GeoQuality",
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "listing_geo_materialization_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "listing_geo_materialization_snapshots_run_id_idx"
  ON "listing_geo_materialization_snapshots"("run_id");

CREATE INDEX IF NOT EXISTS "listing_geo_materialization_snapshots_listing_id_idx"
  ON "listing_geo_materialization_snapshots"("listing_id");

DO $$ BEGIN
  ALTER TABLE "listing_geo_materialization_snapshots"
    ADD CONSTRAINT "listing_geo_materialization_snapshots_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

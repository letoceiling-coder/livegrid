-- Iter 57: Trust + listing quality + fraud safety (additive)

CREATE TYPE "ListingTrustFlagType" AS ENUM (
  'DUPLICATE_LISTING',
  'REPOST_LOOP',
  'RAPID_ARCHIVE_REPOST',
  'CONTACT_SPAM',
  'PROMOTION_CHURN',
  'GEO_MISMATCH',
  'PRICE_OSCILLATION',
  'LOW_QUALITY',
  'STALE_LISTING'
);

CREATE TYPE "ListingTrustFlagSeverity" AS ENUM ('INFO', 'WARN', 'ALERT');

CREATE TYPE "AgencyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');

CREATE TABLE IF NOT EXISTS "listing_trust_scores" (
  "id" SERIAL NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "quality_score" INTEGER NOT NULL DEFAULT 0,
  "fingerprint_hash" VARCHAR(64),
  "factors_json" JSONB NOT NULL DEFAULT '{}',
  "flag_codes" JSONB NOT NULL DEFAULT '[]',
  "last_scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "listing_trust_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_trust_scores_listing_id_key"
  ON "listing_trust_scores"("listing_id");
CREATE INDEX IF NOT EXISTS "listing_trust_scores_quality_score_idx"
  ON "listing_trust_scores"("quality_score");
CREATE INDEX IF NOT EXISTS "listing_trust_scores_fingerprint_hash_idx"
  ON "listing_trust_scores"("fingerprint_hash");

ALTER TABLE "listing_trust_scores"
  ADD CONSTRAINT "listing_trust_scores_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agent_trust_scores" (
  "id" SERIAL NOT NULL,
  "user_id" UUID NOT NULL,
  "trust_score" INTEGER NOT NULL DEFAULT 50,
  "reject_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_count" INTEGER NOT NULL DEFAULT 0,
  "approved_count" INTEGER NOT NULL DEFAULT 0,
  "listing_count" INTEGER NOT NULL DEFAULT 0,
  "flags_json" JSONB NOT NULL DEFAULT '[]',
  "last_scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_trust_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_trust_scores_user_id_key"
  ON "agent_trust_scores"("user_id");
CREATE INDEX IF NOT EXISTS "agent_trust_scores_trust_score_idx"
  ON "agent_trust_scores"("trust_score");

ALTER TABLE "agent_trust_scores"
  ADD CONSTRAINT "agent_trust_scores_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_verifications" (
  "id" SERIAL NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "AgencyVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verified_at" TIMESTAMP(3),
  "verified_by" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agency_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_verifications_user_id_key"
  ON "agency_verifications"("user_id");

ALTER TABLE "agency_verifications"
  ADD CONSTRAINT "agency_verifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_verifications"
  ADD CONSTRAINT "agency_verifications_verified_by_fkey"
  FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "listing_flags" (
  "id" SERIAL NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "user_id" UUID,
  "flag_type" "ListingTrustFlagType" NOT NULL,
  "severity" "ListingTrustFlagSeverity" NOT NULL DEFAULT 'WARN',
  "dedupe_key" VARCHAR(320) NOT NULL,
  "meta_json" JSONB NOT NULL DEFAULT '{}',
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "listing_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_flags_dedupe_key_key"
  ON "listing_flags"("dedupe_key");
CREATE INDEX IF NOT EXISTS "listing_flags_listing_id_created_at_idx"
  ON "listing_flags"("listing_id", "created_at");
CREATE INDEX IF NOT EXISTS "listing_flags_flag_type_idx"
  ON "listing_flags"("flag_type");
CREATE INDEX IF NOT EXISTS "listing_flags_user_id_idx"
  ON "listing_flags"("user_id");

ALTER TABLE "listing_flags"
  ADD CONSTRAINT "listing_flags_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "listing_flags"
  ADD CONSTRAINT "listing_flags_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

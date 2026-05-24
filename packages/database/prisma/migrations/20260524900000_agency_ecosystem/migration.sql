-- Iter 60: agency + agent public ecosystem (additive)

CREATE TYPE "PublicProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

CREATE TABLE "agency_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "slug" VARCHAR(64) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "logo_url" TEXT,
  "banner_url" TEXT,
  "about" TEXT,
  "phone" VARCHAR(64),
  "email" VARCHAR(255),
  "website" TEXT,
  "social_links_json" JSONB NOT NULL DEFAULT '{}',
  "status" "PublicProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "theme_key" VARCHAR(32) NOT NULL DEFAULT 'default',
  "region_ids_json" JSONB NOT NULL DEFAULT '[]',
  "moderation_note" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agency_profiles_user_id_key" ON "agency_profiles"("user_id");
CREATE UNIQUE INDEX "agency_profiles_slug_key" ON "agency_profiles"("slug");
CREATE INDEX "agency_profiles_status_idx" ON "agency_profiles"("status");

CREATE TABLE "agent_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "agency_profile_id" UUID,
  "slug" VARCHAR(64) NOT NULL,
  "bio" TEXT,
  "specializations_json" JSONB NOT NULL DEFAULT '[]',
  "region_ids_json" JSONB NOT NULL DEFAULT '[]',
  "status" "PublicProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "show_phone" BOOLEAN NOT NULL DEFAULT false,
  "show_email" BOOLEAN NOT NULL DEFAULT false,
  "moderation_note" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_profiles_user_id_key" ON "agent_profiles"("user_id");
CREATE UNIQUE INDEX "agent_profiles_slug_key" ON "agent_profiles"("slug");
CREATE INDEX "agent_profiles_agency_profile_id_idx" ON "agent_profiles"("agency_profile_id");
CREATE INDEX "agent_profiles_status_idx" ON "agent_profiles"("status");

ALTER TABLE "agency_profiles"
  ADD CONSTRAINT "agency_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_profiles"
  ADD CONSTRAINT "agent_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_profiles"
  ADD CONSTRAINT "agent_profiles_agency_profile_id_fkey"
  FOREIGN KEY ("agency_profile_id") REFERENCES "agency_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

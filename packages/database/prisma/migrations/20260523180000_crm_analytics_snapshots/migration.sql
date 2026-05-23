-- CRM operational analytics snapshots (Iter 37)

CREATE TYPE "CrmSnapshotKind" AS ENUM (
  'GLOBAL_OPS',
  'FUNNEL',
  'SLA',
  'BEHAVIOR',
  'MANAGERS'
);

CREATE TABLE "crm_analytics_snapshots" (
  "id" SERIAL NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "kind" "CrmSnapshotKind" NOT NULL,
  "payload" JSONB NOT NULL,
  "compute_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_analytics_snapshots_snapshot_date_kind_key"
  ON "crm_analytics_snapshots"("snapshot_date", "kind");

CREATE INDEX "crm_analytics_snapshots_kind_snapshot_date_idx"
  ON "crm_analytics_snapshots"("kind", "snapshot_date");

-- Iter 56: CRM automation + follow-up engine (additive)

ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'FOLLOWUP_DUE';
ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'ESCALATION_ASSIGNED';
ALTER TYPE "CrmNotificationType" ADD VALUE IF NOT EXISTS 'STALE_RESCUE_TRIGGERED';

CREATE TYPE "CrmAutomationRuleType" AS ENUM (
  'CALLBACK_OVERDUE',
  'STALE_NEGOTIATION',
  'NO_REPLY',
  'REOPEN_RISK',
  'NEW_VIP_INQUIRY',
  'SAVED_SEARCH_HOT_LEAD'
);

CREATE TYPE "CrmFollowupTaskType" AS ENUM (
  'CALL_CLIENT',
  'SEND_REMINDER',
  'REVISIT_STALE',
  'ESCALATE_NEGOTIATION',
  'SCHEDULE_VIEWING',
  'RESCUE_REOPEN'
);

CREATE TYPE "CrmFollowupTaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'DISMISSED',
  'EXPIRED'
);

CREATE TYPE "CrmAutomationActionKind" AS ENUM (
  'CREATE_TASK',
  'NOTIFY',
  'ESCALATE'
);

CREATE TABLE IF NOT EXISTS "crm_automation_rules" (
  "id" SERIAL NOT NULL,
  "rule_type" "CrmAutomationRuleType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config_json" JSONB NOT NULL DEFAULT '{}',
  "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
  "max_actions_per_day" INTEGER NOT NULL DEFAULT 50,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_automation_rules_rule_type_key"
  ON "crm_automation_rules"("rule_type");

CREATE TABLE IF NOT EXISTS "crm_automation_actions" (
  "id" SERIAL NOT NULL,
  "rule_id" INTEGER NOT NULL,
  "request_id" INTEGER,
  "assignee_id" UUID,
  "action_kind" "CrmAutomationActionKind" NOT NULL,
  "dedupe_key" VARCHAR(320) NOT NULL,
  "meta_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crm_automation_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_automation_actions_dedupe_key_key"
  ON "crm_automation_actions"("dedupe_key");
CREATE INDEX IF NOT EXISTS "crm_automation_actions_rule_id_created_at_idx"
  ON "crm_automation_actions"("rule_id", "created_at");
CREATE INDEX IF NOT EXISTS "crm_automation_actions_request_id_idx"
  ON "crm_automation_actions"("request_id");

ALTER TABLE "crm_automation_actions"
  ADD CONSTRAINT "crm_automation_actions_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "crm_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_automation_actions"
  ADD CONSTRAINT "crm_automation_actions_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_automation_actions"
  ADD CONSTRAINT "crm_automation_actions_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "crm_followup_tasks" (
  "id" SERIAL NOT NULL,
  "request_id" INTEGER NOT NULL,
  "assignee_id" UUID NOT NULL,
  "task_type" "CrmFollowupTaskType" NOT NULL,
  "rule_type" "CrmAutomationRuleType",
  "status" "CrmFollowupTaskStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "priority_score" INTEGER NOT NULL DEFAULT 50,
  "due_at" TIMESTAMP(3),
  "dedupe_key" VARCHAR(320) NOT NULL,
  "action_id" INTEGER,
  "completed_at" TIMESTAMP(3),
  "completed_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_followup_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_followup_tasks_dedupe_key_key"
  ON "crm_followup_tasks"("dedupe_key");
CREATE INDEX IF NOT EXISTS "crm_followup_tasks_assignee_id_status_due_at_idx"
  ON "crm_followup_tasks"("assignee_id", "status", "due_at");
CREATE INDEX IF NOT EXISTS "crm_followup_tasks_request_id_idx"
  ON "crm_followup_tasks"("request_id");
CREATE INDEX IF NOT EXISTS "crm_followup_tasks_status_due_at_idx"
  ON "crm_followup_tasks"("status", "due_at");

ALTER TABLE "crm_followup_tasks"
  ADD CONSTRAINT "crm_followup_tasks_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_followup_tasks"
  ADD CONSTRAINT "crm_followup_tasks_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_followup_tasks"
  ADD CONSTRAINT "crm_followup_tasks_action_id_fkey"
  FOREIGN KEY ("action_id") REFERENCES "crm_automation_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_followup_tasks"
  ADD CONSTRAINT "crm_followup_tasks_completed_by_fkey"
  FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default rules (idempotent)
INSERT INTO "crm_automation_rules" ("rule_type", "enabled", "config_json", "cooldown_hours", "max_actions_per_day", "updated_at")
VALUES
  ('CALLBACK_OVERDUE', true, '{"graceMinutes":15}', 12, 100, CURRENT_TIMESTAMP),
  ('STALE_NEGOTIATION', true, '{}', 24, 50, CURRENT_TIMESTAMP),
  ('NO_REPLY', true, '{"pendingHours":4}', 8, 80, CURRENT_TIMESTAMP),
  ('REOPEN_RISK', true, '{}', 48, 30, CURRENT_TIMESTAMP),
  ('NEW_VIP_INQUIRY', true, '{"minPriceRub":15000000}', 24, 40, CURRENT_TIMESTAMP),
  ('SAVED_SEARCH_HOT_LEAD', true, '{}', 24, 40, CURRENT_TIMESTAMP)
ON CONFLICT ("rule_type") DO NOTHING;

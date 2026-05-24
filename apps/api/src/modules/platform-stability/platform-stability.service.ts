import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CRITICAL_DB_COLUMNS,
  CRITICAL_DB_ENUMS,
  DbCompatibilityIssue,
  DbCompatibilityReport,
  mergeDbCompatibility,
  missingColumnIssue,
  missingEnumIssue,
  pendingMigrationIssue,
} from '@lg/shared';

export type PlatformStabilitySnapshot = DbCompatibilityReport & {
  pendingMigrations: string[];
  bootWarnings: string[];
  bootWarningsRu: string[];
};

@Injectable()
export class PlatformStabilityService implements OnModuleInit {
  private readonly logger = new Logger(PlatformStabilityService.name);
  private snapshot: PlatformStabilitySnapshot = {
    ok: true,
    checkedAt: new Date().toISOString(),
    issues: [],
    pendingMigrations: [],
    bootWarnings: [],
    bootWarningsRu: [],
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.snapshot = await this.runCompatibilityCheck();
      for (const w of this.snapshot.bootWarningsRu) {
        this.logger.warn(`[platform-stability] ${w}`);
      }
      if (!this.snapshot.ok) {
        this.logger.error(
          `[platform-stability] DB/schema drift detected (${this.snapshot.issues.length} issue(s)). API may return 500 on affected endpoints.`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[platform-stability] Boot check skipped: ${msg}`);
    }
  }

  getSnapshot(): PlatformStabilitySnapshot {
    return this.snapshot;
  }

  async refresh(): Promise<PlatformStabilitySnapshot> {
    this.snapshot = await this.runCompatibilityCheck();
    return this.snapshot;
  }

  async runCompatibilityCheck(): Promise<PlatformStabilitySnapshot> {
    const dbReachable = await this.prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    if (!dbReachable) {
      const issue: DbCompatibilityIssue = {
        kind: 'missing_column',
        severity: 'error',
        message: 'Database unreachable',
        messageRu: 'База данных недоступна. Запустите PostgreSQL: ~/livegrid/scripts/local-infra-start.sh',
      };
      return {
        ok: false,
        checkedAt: new Date().toISOString(),
        issues: [issue],
        pendingMigrations: [],
        bootWarnings: [issue.message],
        bootWarningsRu: [issue.messageRu],
      };
    }

    const [pending, columnIssues, enumIssues] = await Promise.all([
      this.detectPendingMigrations(),
      this.checkCriticalColumns(),
      this.checkCriticalEnums(),
    ]);

    const issues: DbCompatibilityIssue[] = [
      ...(pending.length ? [pendingMigrationIssue(pending)] : []),
      ...columnIssues,
      ...enumIssues,
    ];

    const merged = mergeDbCompatibility([{ issues }]);
    const bootWarningsRu = issues.map((i) => i.messageRu);
    const bootWarnings = issues.map((i) => i.message);

    return {
      ...merged,
      pendingMigrations: pending,
      bootWarnings,
      bootWarningsRu,
    };
  }

  private migrationsDir(): string {
    return join(process.cwd(), '..', '..', 'packages', 'database', 'prisma', 'migrations');
  }

  private async detectPendingMigrations(): Promise<string[]> {
    const dir = this.migrationsDir();
    if (!existsSync(dir)) return [];

    const folders = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    const applied = await this.prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const appliedSet = new Set(applied.map((r) => r.migration_name));
    return folders.filter((f) => !appliedSet.has(f));
  }

  private async checkCriticalColumns(): Promise<DbCompatibilityIssue[]> {
    const issues: DbCompatibilityIssue[] = [];
    for (const { table, column } of CRITICAL_DB_COLUMNS) {
      const rows = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
        ) AS exists
      `;
      if (!rows[0]?.exists) {
        issues.push(missingColumnIssue(table, column));
      }
    }
    return issues;
  }

  private async checkCriticalEnums(): Promise<DbCompatibilityIssue[]> {
    const issues: DbCompatibilityIssue[] = [];
    for (const enumName of CRITICAL_DB_ENUMS) {
      const rows = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = ${enumName}) AS exists
      `;
      if (!rows[0]?.exists) {
        issues.push(missingEnumIssue(enumName));
      }
    }
    return issues;
  }
}

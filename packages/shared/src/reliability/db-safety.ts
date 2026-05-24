/** Critical schema markers — Iter 61 platform stabilization (read-only checks). */

export const CRITICAL_DB_COLUMNS = [
  { table: 'listings', column: 'visibility' },
  { table: 'listings', column: 'owner_user_id' },
  { table: 'listings', column: 'last_activity_at' },
  { table: 'listing_wizard_snapshots', column: 'listing_id' },
  { table: 'billing_accounts', column: 'owner_user_id' },
  { table: 'agency_profiles', column: 'slug' },
  { table: 'agent_profiles', column: 'slug' },
] as const;

export const CRITICAL_DB_ENUMS = [
  'ListingVisibility',
  'ListingPromotionTier',
  'BillingPlanCode',
] as const;

export type DbCompatibilityIssue = {
  kind: 'missing_column' | 'missing_enum' | 'pending_migration' | 'orphan_fk';
  severity: 'warn' | 'error';
  message: string;
  messageRu: string;
  detail?: string;
};

export type DbCompatibilityReport = {
  ok: boolean;
  checkedAt: string;
  issues: DbCompatibilityIssue[];
};

export function mergeDbCompatibility(
  partials: Pick<DbCompatibilityReport, 'issues'>[],
): DbCompatibilityReport {
  const issues = partials.flatMap((p) => p.issues);
  return {
    ok: issues.every((i) => i.severity !== 'error'),
    checkedAt: new Date().toISOString(),
    issues,
  };
}

export function missingColumnIssue(table: string, column: string): DbCompatibilityIssue {
  return {
    kind: 'missing_column',
    severity: 'error',
    message: `Missing column ${table}.${column}`,
    messageRu: `В базе отсутствует колонка ${table}.${column}. Примените миграции: npx prisma migrate deploy`,
    detail: `${table}.${column}`,
  };
}

export function missingEnumIssue(enumName: string): DbCompatibilityIssue {
  return {
    kind: 'missing_enum',
    severity: 'error',
    message: `Missing enum type ${enumName}`,
    messageRu: `В базе отсутствует тип ${enumName}. Примените миграции.`,
    detail: enumName,
  };
}

export function pendingMigrationIssue(names: string[]): DbCompatibilityIssue {
  const list = names.slice(0, 5).join(', ');
  const suffix = names.length > 5 ? ` (+${names.length - 5})` : '';
  return {
    kind: 'pending_migration',
    severity: 'error',
    message: `${names.length} pending migration(s): ${list}${suffix}`,
    messageRu: `Не применено миграций: ${names.length}. Выполните: cd packages/database && npx prisma migrate deploy`,
    detail: names.join(','),
  };
}

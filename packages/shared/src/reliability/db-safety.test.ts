import { describe, it, expect } from 'vitest';
import {
  CRITICAL_DB_COLUMNS,
  CRITICAL_DB_ENUMS,
  mergeDbCompatibility,
  missingColumnIssue,
  pendingMigrationIssue,
} from './db-safety.js';

describe('db safety', () => {
  it('critical columns list is non-empty', () => {
    expect(CRITICAL_DB_COLUMNS.length).toBeGreaterThan(3);
    expect(CRITICAL_DB_ENUMS.length).toBeGreaterThan(0);
  });

  it('mergeDbCompatibility flags errors', () => {
    const r = mergeDbCompatibility([
      { issues: [missingColumnIssue('listings', 'visibility')] },
      { issues: [] },
    ]);
    expect(r.ok).toBe(false);
    expect(r.issues[0].messageRu).toContain('миграции');
  });

  it('pending migration issue includes count', () => {
    const i = pendingMigrationIssue(['20260523180000_test', '20260524100000_test']);
    expect(i.kind).toBe('pending_migration');
    expect(i.messageRu).toContain('2');
  });
});

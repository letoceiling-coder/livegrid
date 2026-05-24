import { describe, it, expect } from 'vitest';
import { evaluateWorkspaceDeps, summarizeWorkspaceReport } from './workspace-integrity.js';

describe('workspace integrity', () => {
  it('flags import without declared dep', () => {
    const issues = evaluateWorkspaceDeps({
      appName: '@lg/web',
      declaredDeps: {},
      importedPackages: ['@lg/shared'],
    });
    expect(issues.some((i) => i.kind === 'import_without_dep')).toBe(true);
  });

  it('passes when workspace dep present', () => {
    const issues = evaluateWorkspaceDeps({
      appName: '@lg/web',
      declaredDeps: { '@lg/shared': 'workspace:*' },
      importedPackages: ['@lg/shared'],
    });
    const report = summarizeWorkspaceReport(issues);
    expect(report.ok).toBe(true);
  });
});

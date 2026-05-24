/** Monorepo workspace dependency expectations — Iter 61. */

export const WORKSPACE_PACKAGES = ['@lg/shared', '@lg/database'] as const;

/** Apps that import @lg/shared must declare workspace:* dependency. */
export const APPS_REQUIRING_SHARED = ['@lg/web', '@lg/api'] as const;

export type WorkspaceIntegrityIssue = {
  app: string;
  kind: 'missing_dep' | 'stale_build' | 'import_without_dep';
  package?: string;
  message: string;
  messageRu: string;
};

export type WorkspaceIntegrityReport = {
  ok: boolean;
  checkedAt: string;
  issues: WorkspaceIntegrityIssue[];
};

export function evaluateWorkspaceDeps(input: {
  appName: string;
  declaredDeps: Record<string, string>;
  importedPackages: string[];
}): WorkspaceIntegrityIssue[] {
  const issues: WorkspaceIntegrityIssue[] = [];
  const declared = new Set(Object.keys(input.declaredDeps));

  for (const pkg of input.importedPackages) {
    if (!WORKSPACE_PACKAGES.includes(pkg as (typeof WORKSPACE_PACKAGES)[number])) continue;
    if (!declared.has(pkg)) {
      issues.push({
        app: input.appName,
        kind: 'import_without_dep',
        package: pkg,
        message: `${input.appName} imports ${pkg} but it is missing from package.json dependencies`,
        messageRu: `${input.appName} импортирует ${pkg}, но пакет не указан в dependencies`,
      });
    } else if (!input.declaredDeps[pkg]?.includes('workspace:')) {
      issues.push({
        app: input.appName,
        kind: 'missing_dep',
        package: pkg,
        message: `${input.appName} should use workspace:* for ${pkg}`,
        messageRu: `${input.appName}: для ${pkg} нужен workspace:*`,
      });
    }
  }

  for (const required of WORKSPACE_PACKAGES) {
    if (
      (APPS_REQUIRING_SHARED as readonly string[]).includes(input.appName) &&
      required === '@lg/shared' &&
      !declared.has(required)
    ) {
      issues.push({
        app: input.appName,
        kind: 'missing_dep',
        package: required,
        message: `${input.appName} must depend on ${required}`,
        messageRu: `${input.appName} должен зависеть от ${required}`,
      });
    }
  }

  return issues;
}

export function summarizeWorkspaceReport(issues: WorkspaceIntegrityIssue[]): WorkspaceIntegrityReport {
  return {
    ok: issues.length === 0,
    checkedAt: new Date().toISOString(),
    issues,
  };
}

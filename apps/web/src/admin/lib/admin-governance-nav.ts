/** When true, hide unreleased admin routes (billing, ecosystem, etc.) in production builds. */
export const ADMIN_GOVERNANCE_SLICE =
  import.meta.env.VITE_ADMIN_GOVERNANCE_SLICE === 'true' ||
  import.meta.env.VITE_ADMIN_GOVERNANCE_SLICE === '1';

/** Route prefixes hidden in governance-only production admin. */
export const GOVERNANCE_HIDDEN_ADMIN_ROUTES = new Set([
  '/admin/billing',
  '/admin/ecosystem',
  '/admin/trust',
  '/admin/conversations',
  '/admin/listings/promotions',
]);

export function isAdminNavVisible(path: string): boolean {
  if (!ADMIN_GOVERNANCE_SLICE) return true;
  return !GOVERNANCE_HIDDEN_ADMIN_ROUTES.has(path);
}

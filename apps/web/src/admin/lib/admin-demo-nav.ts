/**
 * Demo / client-facing admin sidebar — hide only unfinished or internal sections.
 * Routes and pages stay registered; remove a path from the set to show it in the menu.
 */

/** Hidden from sidebar (comment = easy to re-enable). */
export const DEMO_HIDDEN_ADMIN_NAV_ROUTES = new Set([
  '/admin/homepage', // Главная: блоки API
  '/admin/reference', // Справочники
  '/admin/buildings', // Корпуса
  '/admin/listings/promotions', // Продвижение
  '/admin/ecosystem',
  '/admin/billing',
  '/admin/system',
  '/admin/trust',
  '/admin/moderation/listings',
  '/admin/conversations', // Переписки
  '/admin/tasks',
  '/admin/ops',
  // Internal / low-priority (not in day-to-day menu)
  '/admin/pages',
  '/admin/tokens',
  '/admin/docs',
  '/admin/blocks',
  '/admin/builders',
  '/admin/sellers',
]);

export function isDemoAdminNavRoute(path: string): boolean {
  return !DEMO_HIDDEN_ADMIN_NAV_ROUTES.has(path);
}

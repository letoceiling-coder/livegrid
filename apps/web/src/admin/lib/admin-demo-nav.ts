/**
 * Demo / client-facing admin sidebar — only working sections visible.
 * Routes and pages stay registered; restore a path here to show it again in the menu.
 */

/** Hidden from sidebar (comment in list = easy to re-enable). */
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
  // Extra technical / unfinished (not in demo menu)
  '/admin/pages',
  '/admin/media',
  '/admin/tokens',
  '/admin/docs',
  '/admin/audit',
  '/admin/telegram-notify',
  '/admin/blocks',
  '/admin/builders',
  '/admin/sellers',
  '/admin/feed-import',
  '/admin/my-listings',
]);

export function isDemoAdminNavRoute(path: string): boolean {
  return !DEMO_HIDDEN_ADMIN_NAV_ROUTES.has(path);
}

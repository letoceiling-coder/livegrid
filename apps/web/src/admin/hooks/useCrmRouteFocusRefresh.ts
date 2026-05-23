import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CRM_FOCUS_REFRESH_DEBOUNCE_MS,
  CRM_FOCUS_REFRESH_MIN_GAP_MS,
} from '@/admin/lib/crm-polling-policy';
import { CRM_FOCUS_SCOPES } from '@/admin/lib/crm-query-keys';
import { crmInvalidateFocus } from '@/admin/lib/crm-invalidation';
import { useCrmRefreshOptional } from '@/admin/context/CrmRefreshContext';
import { crmObsFocusRefresh, crmObsSkipRefresh } from '@/admin/lib/crm-observability';

function resolveFocusPrefixes(pathname: string): readonly (readonly string[])[] {
  if (/^\/admin\/ops/.test(pathname)) return CRM_FOCUS_SCOPES.opsCenter;
  if (/^\/admin\/requests\/\d+/.test(pathname)) return CRM_FOCUS_SCOPES.requestDetail;
  if (/^\/admin\/requests/.test(pathname)) return CRM_FOCUS_SCOPES.requestsList;
  if (pathname === '/admin' || pathname === '/admin/') return CRM_FOCUS_SCOPES.dashboard;
  return [];
}

/**
 * Single layout-level focus refresh — route-scoped, deduped invalidation (Iter 43).
 */
export function useCrmRouteFocusRefresh(): void {
  const location = useLocation();
  const qc = useQueryClient();
  const ctx = useCrmRefreshOptional();
  const lastGen = useRef(0);
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!ctx) return;
    const gen = ctx.refreshGeneration;
    if (gen === lastGen.current) return;
    lastGen.current = gen;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const prefixes = resolveFocusPrefixes(pathRef.current);
      if (prefixes.length === 0) return;

      const now = Date.now();
      if (now - lastRun.current < CRM_FOCUS_REFRESH_MIN_GAP_MS) {
        crmObsSkipRefresh('min_gap');
        return;
      }
      lastRun.current = now;
      crmObsFocusRefresh();
      void crmInvalidateFocus(qc, prefixes);
    }, CRM_FOCUS_REFRESH_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx?.refreshGeneration, qc, ctx]);
}

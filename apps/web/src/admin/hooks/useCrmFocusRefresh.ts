import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CRM_FOCUS_REFRESH_DEBOUNCE_MS,
  CRM_FOCUS_REFRESH_MIN_GAP_MS,
} from '@/admin/lib/crm-polling-policy';
import { crmInvalidateFocus } from '@/admin/lib/crm-invalidation';
import { useCrmRefreshOptional } from '@/admin/context/CrmRefreshContext';
import { crmObsFocusRefresh, crmObsSkipRefresh } from '@/admin/lib/crm-observability';

/**
 * Debounced invalidate on tab restore / window focus — prefer useCrmRouteFocusRefresh at layout.
 */
export function useCrmFocusRefresh(queryKeyPrefixes: readonly (readonly string[])[]) {
  const qc = useQueryClient();
  const ctx = useCrmRefreshOptional();
  const lastGen = useRef(0);
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keysRef = useRef(queryKeyPrefixes);
  keysRef.current = queryKeyPrefixes;

  useEffect(() => {
    if (!ctx) return;
    const gen = ctx.refreshGeneration;
    if (gen === lastGen.current) return;
    lastGen.current = gen;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastRun.current < CRM_FOCUS_REFRESH_MIN_GAP_MS) {
        crmObsSkipRefresh('min_gap');
        return;
      }
      lastRun.current = now;
      crmObsFocusRefresh();
      void crmInvalidateFocus(qc, keysRef.current);
    }, CRM_FOCUS_REFRESH_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx?.refreshGeneration, qc, ctx]);
}

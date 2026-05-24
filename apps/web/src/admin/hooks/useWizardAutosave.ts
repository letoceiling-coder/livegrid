import { useCallback, useEffect, useRef } from 'react';
import type { WizardDraftResponse } from '@lg/shared';
import { ApiError, apiPost, apiPut } from '@/lib/api';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';
import { draftToServerPayload } from '@/admin/lib/listingWizardHydration';

const DEBOUNCE_MS = 1500;

type Options = {
  draft: ListingWizardDraft;
  step: number;
  enabled: boolean;
  onPatched: (patch: Partial<ListingWizardDraft>) => void;
  onConflict: (currentVersion: number) => void;
};

export function useWizardAutosave({ draft, step, enabled, onPatched, onConflict }: Options) {
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const flushSave = useCallback(async () => {
    const d = draftRef.current;
    if (!d.serverListingId || !d.regionId || inflightRef.current) return;

    inflightRef.current = true;
    onPatched({ autosaveStatus: 'saving' });

    try {
      const res = await apiPut<{
        listingId: number;
        version: number;
        updatedAt: string;
        isPendingRevision: boolean;
      }>(`/admin/listings/wizard/${d.serverListingId}/draft`, {
        payload: draftToServerPayload(d),
        expectedVersion: d.serverVersion,
        wizardStep: step,
      });

      onPatched({
        serverVersion: res.version,
        lastServerSavedAt: res.updatedAt,
        hasPendingRevision: res.isPendingRevision,
        isDirty: false,
        autosaveStatus: 'saved',
        currentStep: step,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        try {
          const j = JSON.parse(e.message) as { currentVersion?: number; message?: string };
          if (j.currentVersion != null) {
            onConflict(j.currentVersion);
            onPatched({ autosaveStatus: 'conflict' });
            inflightRef.current = false;
            return;
          }
        } catch {
          // ignore
        }
      }
      onPatched({ autosaveStatus: 'error' });
    } finally {
      inflightRef.current = false;
    }
  }, [onConflict, onPatched, step]);

  useEffect(() => {
    if (!enabled || !draft.isDirty || !draft.serverListingId) return;

    onPatched({ autosaveStatus: 'pending' });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushSave();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [draft, enabled, flushSave, onPatched]);

  const ensureServerDraft = useCallback(
    async (regionId: number, kind: ListingWizardDraft['kind']) => {
      if (draftRef.current.serverListingId) return draftRef.current.serverListingId;
      const created = await apiPost<WizardDraftResponse>(
        '/admin/listings/wizard/drafts',
        { regionId, kind: kind ?? undefined },
      );
      onPatched({
        serverListingId: created.listingId,
        serverVersion: created.version,
        lastServerSavedAt: created.updatedAt,
        isDirty: false,
        autosaveStatus: 'saved',
      });
      return created.listingId;
    },
    [onPatched],
  );

  return { flushSave, ensureServerDraft };
}

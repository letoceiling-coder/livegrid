import type { WizardDraftResponse, WizardServerPayload } from '@lg/shared';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';
import { serverPayloadToDraft, draftToServerPayload } from '@/admin/lib/listingWizardHydration';

export function mergeHydratedDraft(
  server: WizardDraftResponse,
  local: ListingWizardDraft | null,
): ListingWizardDraft {
  const fromServer = serverPayloadToDraft(server.payload, {
    listingId: server.listingId,
    version: server.version,
    visibility: server.visibility,
    moderationNote: server.moderationNote,
    isPendingRevision: server.isPendingRevision,
    updatedAt: server.updatedAt,
    wizardStep: server.wizardStep,
  });

  if (!local?.serverListingId || local.serverListingId !== server.listingId) {
    return fromServer;
  }

  const localTs = local.lastServerSavedAt ? Date.parse(local.lastServerSavedAt) : 0;
  const serverTs = Date.parse(server.updatedAt);
  if (localTs > serverTs && local.isDirty) {
    return {
      ...local,
      serverVersion: server.version,
      visibility: server.visibility,
      moderationNote: server.moderationNote,
      hasPendingRevision: server.isPendingRevision,
    };
  }

  return fromServer;
}

export { draftToServerPayload };

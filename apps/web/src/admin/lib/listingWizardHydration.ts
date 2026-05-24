import type { ListingVisibility, WizardServerPayload } from '@lg/shared';
import type { ListingWizardDraft, PublishAction } from '@/admin/lib/listingWizardDraft';
import { emptySellerForm } from '@/admin/components/SellerFields';

export function draftToServerPayload(draft: ListingWizardDraft): WizardServerPayload {
  return {
    kind: draft.kind,
    regionId: draft.regionId,
    blockId: draft.blockId,
    address: draft.address,
    lat: draft.lat,
    lng: draft.lng,
    price: draft.price,
    ownerUserId: draft.ownerUserId,
    ownerMode: draft.ownerMode,
    publishAction:
      draft.publishAction === 'submit_review' ? 'submit_review' : draft.publishAction,
    apartment: draft.apartment,
    house: draft.house,
    land: draft.land,
    commercial: draft.commercial,
    parking: draft.parking,
    mainPhotoUrl: draft.mainPhotoUrl,
    extraPhotoUrls: draft.extraPhotoUrls,
    planUrl: draft.planUrl,
    seller: {
      fullName: draft.seller.fullName,
      phone: draft.seller.phone,
      email: draft.seller.email,
      address: draft.seller.address,
    },
  };
}

export function serverPayloadToDraft(
  payload: WizardServerPayload,
  meta: {
    listingId: number;
    version: number;
    visibility: ListingVisibility;
    moderationNote: string | null;
    isPendingRevision: boolean;
    updatedAt: string;
    wizardStep: number;
  },
): ListingWizardDraft {
  const publishAction: PublishAction =
    payload.publishAction === 'submit_review'
      ? 'submit_review'
      : payload.publishAction === 'publish'
        ? 'publish'
        : payload.publishAction === 'archive'
          ? 'archive'
          : 'draft';

  return {
    kind: payload.kind,
    regionId: payload.regionId,
    blockId: payload.blockId,
    address: payload.address,
    lat: payload.lat,
    lng: payload.lng,
    price: payload.price,
    ownerUserId: payload.ownerUserId,
    ownerMode: payload.ownerMode,
    publishAction,
    serverListingId: meta.listingId,
    serverVersion: meta.version,
    visibility: meta.visibility,
    moderationNote: meta.moderationNote,
    hasPendingRevision: meta.isPendingRevision,
    lastServerSavedAt: meta.updatedAt,
    currentStep: meta.wizardStep,
    isDirty: false,
    autosaveStatus: 'saved',
    apartment: { ...payload.apartment },
    house: { ...payload.house },
    land: { ...payload.land },
    commercial: { ...payload.commercial },
    parking: { ...payload.parking },
    mainPhotoUrl: payload.mainPhotoUrl,
    extraPhotoUrls: [...payload.extraPhotoUrls],
    planUrl: payload.planUrl,
    seller: { ...emptySellerForm, ...payload.seller },
  };
}

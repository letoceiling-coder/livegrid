import type { ListingWizardUiKind } from '@lg/shared';
import { LISTING_FIELD_REGISTRY } from '@lg/shared';
import type { SellerForm } from '@/admin/components/SellerFields';
import { emptySellerForm } from '@/admin/components/SellerFields';

export type PublishAction = 'draft' | 'publish' | 'archive' | 'submit_review';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

export type ListingWizardDraft = {
  kind: ListingWizardUiKind | null;
  regionId: number | null;
  blockId: string;
  address: string;
  lat: string;
  lng: string;
  price: string;
  ownerUserId: string | null;
  ownerMode: 'self' | 'agent' | 'agency';
  publishAction: PublishAction;
  /** Server draft listing id when resuming */
  serverListingId: number | null;
  serverVersion: number;
  visibility: import('@lg/shared').ListingVisibility | null;
  moderationNote: string | null;
  hasPendingRevision: boolean;
  lastServerSavedAt: string | null;
  currentStep: number;
  isDirty: boolean;
  autosaveStatus: AutosaveStatus;
  apartment: Record<string, string | boolean>;
  house: Record<string, string | boolean>;
  land: Record<string, string | boolean>;
  commercial: Record<string, string | boolean>;
  parking: Record<string, string | boolean>;
  mainPhotoUrl: string;
  extraPhotoUrls: string[];
  planUrl: string;
  seller: SellerForm;
};

export const WIZARD_STORAGE_KEY = 'admin:listing-wizard:draft:v2';

function emptyGroupDefaults(kind: ListingWizardUiKind): Record<string, string | boolean> {
  const fields = LISTING_FIELD_REGISTRY[kind];
  const out: Record<string, string | boolean> = {};
  for (const f of fields) {
    out[f.key] = f.type === 'boolean' ? false : '';
  }
  return out;
}

export function makeEmptyWizardDraft(): ListingWizardDraft {
  return {
    kind: null,
    regionId: null,
    blockId: '',
    address: '',
    lat: '',
    lng: '',
    price: '',
    ownerUserId: null,
    ownerMode: 'self',
    publishAction: 'draft',
    serverListingId: null,
    serverVersion: 1,
    visibility: null,
    moderationNote: null,
    hasPendingRevision: false,
    lastServerSavedAt: null,
    currentStep: 0,
    isDirty: false,
    autosaveStatus: 'idle',
    apartment: {
      blockAddress: '',
      marketSegment: 'auto',
      areaTotal: '',
      areaKitchen: '',
      floor: '',
      floorsTotal: '',
      roomTypeId: '',
      finishingId: '',
      buildingName: '',
      number: '',
    },
    house: {
      houseType: '',
      material: 'Блок',
      areaTotal: '',
      areaLand: '',
      floorsCount: '',
      bedrooms: '',
      bathrooms: '',
      settlement: '',
      street: '',
      houseNumber: '',
      districtName: '',
      description: '',
      yearBuilt: '',
      hasGarage: false,
    },
    land: { areaSotki: '', landCategory: '', cadastralNumber: '', hasCommunications: false },
    commercial: { commercialType: '', area: '', floor: '', hasSeparateEntrance: false },
    parking: { parkingType: '', area: '', floor: '', number: '' },
    mainPhotoUrl: '',
    extraPhotoUrls: [],
    planUrl: '',
    seller: { ...emptySellerForm },
  };
}

export function loadWizardDraft(): ListingWizardDraft {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return makeEmptyWizardDraft();
    const parsed = JSON.parse(raw) as Partial<ListingWizardDraft>;
    const base = makeEmptyWizardDraft();
    return {
      ...base,
      ...parsed,
      apartment: { ...base.apartment, ...parsed.apartment },
      house: { ...base.house, ...parsed.house },
      land: { ...base.land, ...parsed.land },
      commercial: { ...base.commercial, ...parsed.commercial },
      parking: { ...base.parking, ...parsed.parking },
      extraPhotoUrls: Array.isArray(parsed.extraPhotoUrls)
        ? parsed.extraPhotoUrls.filter((u): u is string => typeof u === 'string').slice(0, 24)
        : [],
      seller: { ...base.seller, ...parsed.seller },
    };
  } catch {
    return makeEmptyWizardDraft();
  }
}

export function saveWizardDraft(draft: ListingWizardDraft): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota
  }
}

export function clearWizardDraft(): void {
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function applyKindDefaults(draft: ListingWizardDraft, kind: ListingWizardUiKind): ListingWizardDraft {
  const defaults = emptyGroupDefaults(kind);
  const groupKey =
    kind === 'APARTMENT' || kind === 'ROOM'
      ? 'apartment'
      : kind === 'HOUSE' || kind === 'DACHA'
        ? 'house'
        : kind === 'LAND'
          ? 'land'
          : kind === 'COMMERCIAL'
            ? 'commercial'
            : 'parking';
  return {
    ...draft,
    kind,
    [groupKey]: { ...defaults, ...draft[groupKey] },
  };
}

export function toValidationSlice(draft: ListingWizardDraft) {
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
    apartment: draft.apartment,
    house: draft.house,
    land: draft.land,
    commercial: draft.commercial,
    parking: draft.parking,
    extraPhotoUrls: draft.extraPhotoUrls,
  };
}

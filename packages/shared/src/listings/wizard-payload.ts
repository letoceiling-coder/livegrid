import type { ListingWizardUiKind } from './listing-field-registry.js';
import type { ListingVisibility } from '../enums/listing-visibility.js';

export type WizardOwnerMode = 'self' | 'agent' | 'agency';
export type WizardPublishAction = 'draft' | 'publish' | 'archive' | 'submit_review';

/** Server-persisted wizard payload (JSON in listing_wizard_snapshots). */
export type WizardServerPayload = {
  kind: ListingWizardUiKind | null;
  regionId: number | null;
  blockId: string;
  address: string;
  lat: string;
  lng: string;
  price: string;
  ownerUserId: string | null;
  ownerMode: WizardOwnerMode;
  publishAction: WizardPublishAction;
  apartment: Record<string, string | boolean>;
  house: Record<string, string | boolean>;
  land: Record<string, string | boolean>;
  commercial: Record<string, string | boolean>;
  parking: Record<string, string | boolean>;
  mainPhotoUrl: string;
  extraPhotoUrls: string[];
  planUrl: string;
  seller: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
  };
};

export type WizardDraftResponse = {
  listingId: number;
  version: number;
  wizardStep: number;
  visibility: ListingVisibility;
  moderationNote: string | null;
  isPendingRevision: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
  payload: WizardServerPayload;
};

export type WizardAutosaveResponse = {
  listingId: number;
  version: number;
  updatedAt: string;
  isPendingRevision: boolean;
  staleWarning?: boolean;
};

export type ModerationConfig = {
  enabled: boolean;
  agentSelfPublish: boolean;
};

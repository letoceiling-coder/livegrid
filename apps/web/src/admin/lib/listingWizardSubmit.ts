import { resolveWizardApiKind } from '@lg/shared';
import { apiPatch, apiPost } from '@/lib/api';
import type { PublishAction, ListingWizardDraft } from '@/admin/lib/listingWizardDraft';
import { draftToServerPayload } from '@/admin/lib/listingWizardHydration';
import { emptySellerForm, normalizeSellerForm } from '@/admin/components/SellerFields';

function num(s: string): number | undefined {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function intNum(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: string | boolean | undefined): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t || undefined;
}

function bool(v: string | boolean | undefined): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

function buildHouseAddress(house: Record<string, string | boolean>): string | undefined {
  const settlement = str(house.settlement);
  const street = str(house.street);
  const houseNumber = str(house.houseNumber);
  const parts = [settlement, street, houseNumber].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function publishToLegacy(publishAction: PublishAction): { status: string; isPublished: boolean } {
  if (publishAction === 'publish') return { status: 'ACTIVE', isPublished: true };
  if (publishAction === 'archive') return { status: 'INACTIVE', isPublished: false };
  return { status: 'DRAFT', isPublished: false };
}

/** Server-first submit when draft exists on server. */
export async function submitWizardListing(
  draft: ListingWizardDraft,
): Promise<{ id: number; kind: string }> {
  if (!draft.kind || !draft.regionId) throw new Error('Не выбран тип или регион');

  if (draft.serverListingId) {
    const action =
      draft.publishAction === 'submit_review' ? 'submit_review' : draft.publishAction;
    await apiPost(`/admin/listings/wizard/${draft.serverListingId}/submit`, {
      payload: draftToServerPayload({ ...draft, publishAction: action as PublishAction }),
      expectedVersion: draft.serverVersion,
      publishAction: action,
    });
    return {
      id: draft.serverListingId,
      kind: resolveWizardApiKind(draft.kind),
    };
  }

  const apiKind = resolveWizardApiKind(draft.kind);
  const rid = draft.regionId;
  const price = num(draft.price)!;
  const bid = intNum(draft.blockId);
  const lat = num(draft.lat);
  const lng = num(draft.lng);
  const legacy = publishToLegacy(draft.publishAction);
  const seller =
    normalizeSellerForm(draft.seller) ??
    (draft.address.trim() ? { ...emptySellerForm, address: draft.address.trim() } : undefined);

  const addressFromHouse = buildHouseAddress(draft.house);
  const common = {
    regionId: rid,
    price,
    status: legacy.status,
    isPublished: legacy.isPublished,
    ...(bid != null ? { blockId: bid } : {}),
    ...(draft.address.trim()
      ? { address: draft.address.trim() }
      : addressFromHouse
        ? { address: addressFromHouse }
        : {}),
    ...(seller ? { seller } : {}),
    ...(lat != null ? { lat } : {}),
    ...(lng != null ? { lng } : {}),
  };

  let created: { id: number; kind: string };

  switch (apiKind) {
    case 'APARTMENT': {
      const a = draft.apartment;
      const apartment: Record<string, unknown> = { areaTotal: num(String(a.areaTotal)) };
      const ms = str(a.marketSegment);
      if (ms && ms !== 'auto') apartment.marketSegment = ms;
      const ak = num(String(a.areaKitchen ?? ''));
      if (ak != null) apartment.areaKitchen = ak;
      const fl = intNum(String(a.floor ?? ''));
      if (fl != null) apartment.floor = fl;
      const ft = intNum(String(a.floorsTotal ?? ''));
      if (ft != null) apartment.floorsTotal = ft;
      const rt = intNum(String(a.roomTypeId ?? ''));
      if (rt != null) apartment.roomTypeId = rt;
      const fn = intNum(String(a.finishingId ?? ''));
      if (fn != null) apartment.finishingId = fn;
      if (draft.planUrl.trim()) apartment.planUrl = draft.planUrl.trim();
      if (draft.mainPhotoUrl.trim()) apartment.finishingPhotoUrl = draft.mainPhotoUrl.trim();
      if (draft.extraPhotoUrls.length) apartment.extraPhotoUrls = draft.extraPhotoUrls;
      const blockAddress = str(a.blockAddress);
      if (blockAddress) apartment.blockAddress = blockAddress;
      else if (draft.address.trim()) apartment.blockAddress = draft.address.trim();
      const buildingName = str(a.buildingName);
      if (buildingName) apartment.buildingName = buildingName;
      const number = str(a.number);
      if (number) apartment.number = number;
      created = await apiPost('/admin/listings/manual-apartment', { ...common, apartment });
      break;
    }
    case 'HOUSE': {
      const h = draft.house;
      const house: Record<string, unknown> = {};
      const ht = str(h.houseType);
      if (ht) house.houseType = ht;
      const material = str(h.material);
      if (material) house.material = material;
      const at = num(String(h.areaTotal ?? ''));
      if (at != null) house.areaTotal = at;
      const al = num(String(h.areaLand ?? ''));
      if (al != null) house.areaLand = al;
      const fc = intNum(String(h.floorsCount ?? ''));
      if (fc != null) house.floorsCount = fc;
      const br = intNum(String(h.bedrooms ?? ''));
      if (br != null) house.bedrooms = br;
      const ba = intNum(String(h.bathrooms ?? ''));
      if (ba != null) house.bathrooms = ba;
      const yb = intNum(String(h.yearBuilt ?? ''));
      if (yb != null) house.yearBuilt = yb;
      house.hasGarage = bool(h.hasGarage) ?? false;
      const settlement = str(h.settlement);
      if (settlement) house.settlement = settlement;
      const street = str(h.street);
      if (street) house.street = street;
      const houseNumber = str(h.houseNumber);
      if (houseNumber) house.houseNumber = houseNumber;
      const districtName = str(h.districtName);
      if (districtName) house.districtName = districtName;
      const description = str(h.description);
      if (description) house.description = description;
      if (draft.mainPhotoUrl.trim()) house.photoUrl = draft.mainPhotoUrl.trim();
      if (draft.extraPhotoUrls.length) house.extraPhotoUrls = draft.extraPhotoUrls;
      created = await apiPost('/admin/listings/manual-house', { ...common, house });
      break;
    }
    case 'LAND': {
      const l = draft.land;
      const land: Record<string, unknown> = {};
      const a = num(String(l.areaSotki ?? ''));
      if (a != null) land.areaSotki = a;
      const landCategory = str(l.landCategory);
      if (landCategory) land.landCategory = landCategory;
      const cadastralNumber = str(l.cadastralNumber);
      if (cadastralNumber) land.cadastralNumber = cadastralNumber;
      land.hasCommunications = bool(l.hasCommunications) ?? false;
      if (draft.mainPhotoUrl.trim()) land.photoUrl = draft.mainPhotoUrl.trim();
      if (draft.extraPhotoUrls.length) land.extraPhotoUrls = draft.extraPhotoUrls;
      created = await apiPost('/admin/listings/manual-land', { ...common, land });
      break;
    }
    case 'COMMERCIAL': {
      const c = draft.commercial;
      const commercial: Record<string, unknown> = {};
      const ct = str(c.commercialType);
      if (ct) commercial.commercialType = ct;
      const a = num(String(c.area ?? ''));
      if (a != null) commercial.area = a;
      const fl = intNum(String(c.floor ?? ''));
      if (fl != null) commercial.floor = fl;
      commercial.hasSeparateEntrance = bool(c.hasSeparateEntrance) ?? false;
      if (draft.mainPhotoUrl.trim()) commercial.photoUrl = draft.mainPhotoUrl.trim();
      if (draft.extraPhotoUrls.length) commercial.extraPhotoUrls = draft.extraPhotoUrls;
      created = await apiPost('/admin/listings/manual-commercial', { ...common, commercial });
      break;
    }
    case 'PARKING': {
      const p = draft.parking;
      const parking: Record<string, unknown> = {};
      const pt = str(p.parkingType);
      if (pt) parking.parkingType = pt;
      const a = num(String(p.area ?? ''));
      if (a != null) parking.area = a;
      const fl = intNum(String(p.floor ?? ''));
      if (fl != null) parking.floor = fl;
      const number = str(p.number);
      if (number) parking.number = number;
      if (draft.mainPhotoUrl.trim()) parking.photoUrl = draft.mainPhotoUrl.trim();
      if (draft.extraPhotoUrls.length) parking.extraPhotoUrls = draft.extraPhotoUrls;
      created = await apiPost('/admin/listings/manual-parking', { ...common, parking });
      break;
    }
    default:
      throw new Error('Не выбран тип объекта');
  }

  if (draft.ownerMode === 'agent' && draft.ownerUserId) {
    await apiPatch(`/admin/listings/${created.id}/assign`, { ownerUserId: draft.ownerUserId });
  }

  const lifecycleAction =
    draft.publishAction === 'publish'
      ? 'publish'
      : draft.publishAction === 'archive'
        ? 'archive'
        : draft.publishAction === 'submit_review'
          ? 'submit_review'
          : 'draft';

  await apiPatch(`/admin/listings/${created.id}/lifecycle`, { action: lifecycleAction });

  return created;
}

export function wizardKindLabel(kind: import('@lg/shared').ListingWizardUiKind | null): string {
  if (!kind) return '—';
  const labels: Record<import('@lg/shared').ListingWizardUiKind, string> = {
    APARTMENT: 'Квартира',
    ROOM: 'Комната',
    HOUSE: 'Дом',
    DACHA: 'Дача',
    LAND: 'Участок',
    COMMERCIAL: 'Коммерция',
    PARKING: 'Паркинг',
  };
  return labels[kind];
}

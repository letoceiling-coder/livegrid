import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import { resolveWizardApiKind } from '@lg/shared';
import type { ListingWizardDraft } from '@/admin/lib/listingWizardDraft';
import { wizardKindLabel } from '@/admin/lib/listingWizardSubmit';

type RegionRow = { id: number; code: string; name: string };
type BlockRow = { id: number; name: string };
type RefOpt = { id: number; name: string };

type Props = {
  draft: ListingWizardDraft;
  regions: RegionRow[];
  blocks: BlockRow[];
  roomTypes: RefOpt[];
};

function num(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function buildPreviewListing(
  draft: ListingWizardDraft,
  regions: RegionRow[],
  blocks: BlockRow[],
  roomTypes: RefOpt[],
): ApiListingCardRow {
  const region = regions.find((r) => r.id === draft.regionId);
  const block = blocks.find((b) => String(b.id) === draft.blockId);
  const apiKind = draft.kind ? resolveWizardApiKind(draft.kind) : 'APARTMENT';
  const rtId = draft.apartment.roomTypeId;
  const roomType = roomTypes.find((r) => String(r.id) === String(rtId));

  const base: ApiListingCardRow = {
    id: draft.serverListingId ?? 0,
    kind: apiKind,
    price: num(draft.price) ?? 0,
    status: draft.publishAction === 'publish' ? 'ACTIVE' : 'DRAFT',
    address: draft.address.trim() || null,
    region: region ? { code: region.code, name: region.name } : null,
    block: block ? { name: block.name, slug: String(block.id) } : null,
  };

  if (apiKind === 'APARTMENT') {
    return {
      ...base,
      apartment: {
        areaTotal: num(String(draft.apartment.areaTotal ?? '')) ?? null,
        areaKitchen: num(String(draft.apartment.areaKitchen ?? '')) ?? null,
        floor: num(String(draft.apartment.floor ?? '')) ? Number(draft.apartment.floor) : null,
        floorsTotal: num(String(draft.apartment.floorsTotal ?? ''))
          ? Number(draft.apartment.floorsTotal)
          : null,
        planUrl: draft.planUrl || null,
        finishingPhotoUrl: draft.mainPhotoUrl || null,
        extraPhotoUrls: draft.extraPhotoUrls,
        roomType: roomType ? { name: roomType.name } : { name: wizardKindLabel(draft.kind) },
      },
    };
  }
  if (apiKind === 'HOUSE') {
    return {
      ...base,
      house: {
        areaTotal: num(String(draft.house.areaTotal ?? '')) ?? null,
        areaLand: num(String(draft.house.areaLand ?? '')) ?? null,
        floorsCount: num(String(draft.house.floorsCount ?? ''))
          ? Number(draft.house.floorsCount)
          : null,
        photoUrl: draft.mainPhotoUrl || null,
        extraPhotoUrls: draft.extraPhotoUrls,
      },
    };
  }
  if (apiKind === 'LAND') {
    return {
      ...base,
      land: {
        areaSotki: num(String(draft.land.areaSotki ?? '')) ?? null,
        landCategory: String(draft.land.landCategory ?? '') || null,
        photoUrl: draft.mainPhotoUrl || null,
        extraPhotoUrls: draft.extraPhotoUrls,
      },
    };
  }
  if (apiKind === 'COMMERCIAL') {
    return {
      ...base,
      commercial: {
        commercialType: String(draft.commercial.commercialType ?? '') || null,
        area: num(String(draft.commercial.area ?? '')) ?? null,
        floor: num(String(draft.commercial.floor ?? '')) ? Number(draft.commercial.floor) : null,
      },
    };
  }
  return {
    ...base,
    parking: {
      parkingType: String(draft.parking.parkingType ?? '') || null,
      area: num(String(draft.parking.area ?? '')) ?? null,
      floor: num(String(draft.parking.floor ?? '')) ? Number(draft.parking.floor) : null,
    },
  };
}

export default function ListingWizardPreviewCard({ draft, regions, blocks, roomTypes }: Props) {
  const preview = buildPreviewListing(draft, regions, blocks, roomTypes);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Так объект будет выглядеть в каталоге. Ссылка активируется после публикации.
      </p>
      <div className="max-w-sm mx-auto pointer-events-none select-none">
        <ListingCard listing={preview} />
      </div>
    </div>
  );
}

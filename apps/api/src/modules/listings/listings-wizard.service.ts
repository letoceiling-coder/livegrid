import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  applyLifecycleAction,
  isLiveListingVisibility,
  resolveRoomListingTypeIds,
  resolveWizardApiKind,
  type ListingWizardUiKind,
  type WizardServerPayload,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsGovernanceService } from './listings-governance.service';
import type { SubmitWizardDraftDto, WizardPayloadDto } from './dto/listing-wizard.dto';

type ActorContext = { userId: string; role: string };

const UI_KINDS: ListingWizardUiKind[] = [
  'APARTMENT',
  'ROOM',
  'HOUSE',
  'DACHA',
  'LAND',
  'COMMERCIAL',
  'PARKING',
];

function dec(v: string | null | undefined): string {
  if (v == null) return '';
  return String(v);
}

function strField(v: string | boolean | undefined): string {
  return typeof v === 'string' ? v : '';
}

@Injectable()
export class ListingsWizardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governance: ListingsGovernanceService,
  ) {}

  async getModerationConfig(): Promise<{ enabled: boolean; agentSelfPublish: boolean }> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key: 'listing_moderation_enabled' },
      select: { value: true },
    });
    const enabled = row?.value === 'true' || row?.value === '1';
    return { enabled, agentSelfPublish: !enabled };
  }

  async createDraft(regionId: number, kind: ListingWizardUiKind | undefined, actor: ActorContext) {
    const region = await this.prisma.feedRegion.findUnique({ where: { id: regionId } });
    if (!region) throw new NotFoundException('Регион не найден');

    const uiKind = kind && UI_KINDS.includes(kind) ? kind : 'APARTMENT';
    const apiKind = resolveWizardApiKind(uiKind);
    const base = this.governance.manualCreateFields(actor.userId, actor.role, {
      status: 'DRAFT',
      isPublished: false,
    });

    const payload = this.emptyPayload(regionId, uiKind, actor.userId);

    const listing = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          regionId,
          kind: apiKind,
          price: new Prisma.Decimal(1),
          currency: 'RUB',
          status: 'DRAFT',
          dataSource: 'MANUAL',
          isPublished: false,
          draftVersion: 1,
          ...base,
          visibility: 'DRAFT',
          ownerUserId: actor.role === 'agent' ? actor.userId : base.ownerUserId ?? null,
          ...(apiKind === 'APARTMENT'
            ? {
                apartment: {
                  create: {
                    areaTotal: new Prisma.Decimal(1),
                    marketSegment: 'SECONDARY',
                  },
                },
              }
            : {}),
          ...(apiKind === 'HOUSE' ? { house: { create: { areaTotal: new Prisma.Decimal(1) } } } : {}),
          ...(apiKind === 'LAND' ? { land: { create: { areaSotki: new Prisma.Decimal(1) } } } : {}),
          ...(apiKind === 'COMMERCIAL'
            ? { commercial: { create: { area: new Prisma.Decimal(1) } } }
            : {}),
          ...(apiKind === 'PARKING' ? { parking: { create: { area: new Prisma.Decimal(1) } } } : {}),
        },
      });

      await tx.listingWizardSnapshot.create({
        data: {
          listingId: created.id,
          payload: payload as unknown as Prisma.InputJsonValue,
          wizardStep: 0,
          updatedByUserId: actor.userId,
        },
      });

      await this.logHistoryTx(tx, created.id, actor.userId, 'draft_create', { regionId, kind: uiKind });

      return created;
    });

    return this.getDraft(listing.id, actor);
  }

  async getDraft(listingId: number, actor: ActorContext) {
    const listing = await this.requireWizardListing(listingId, actor);
    const snap = await this.prisma.listingWizardSnapshot.findUnique({
      where: { listingId },
    });

    const payload =
      snap?.payload != null
        ? (snap.payload as WizardServerPayload)
        : await this.buildPayloadFromListing(listing);

    return {
      listingId,
      version: listing.draftVersion,
      wizardStep: snap?.wizardStep ?? 0,
      visibility: listing.visibility,
      moderationNote: listing.moderationNote,
      isPendingRevision: snap?.isPendingRevision ?? false,
      updatedAt: (snap?.updatedAt ?? listing.updatedAt).toISOString(),
      updatedByUserId: snap?.updatedByUserId ?? null,
      payload,
    };
  }

  async saveDraft(
    listingId: number,
    dto: { payload: WizardPayloadDto; expectedVersion: number; wizardStep?: number },
    actor: ActorContext,
  ) {
    const listing = await this.requireWizardListing(listingId, actor);
    if (listing.draftVersion !== dto.expectedVersion) {
      throw new ConflictException({
        message: 'Черновик был изменён в другой вкладке или на другом устройстве',
        currentVersion: listing.draftVersion,
      });
    }

    const live = isLiveListingVisibility(listing.visibility);
    const isPendingRevision = live;

    const nextVersion = listing.draftVersion + 1;
    const summary = this.diffSummary(
      (await this.prisma.listingWizardSnapshot.findUnique({ where: { listingId } }))?.payload as
        | WizardServerPayload
        | undefined,
      dto.payload as WizardServerPayload,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.listingWizardSnapshot.upsert({
        where: { listingId },
        create: {
          listingId,
          payload: dto.payload as unknown as Prisma.InputJsonValue,
          wizardStep: dto.wizardStep ?? 0,
          isPendingRevision,
          updatedByUserId: actor.userId,
        },
        update: {
          payload: dto.payload as unknown as Prisma.InputJsonValue,
          wizardStep: dto.wizardStep ?? 0,
          isPendingRevision,
          updatedByUserId: actor.userId,
        },
      });

      await tx.listing.update({
        where: { id: listingId },
        data: {
          draftVersion: nextVersion,
          lastActivityAt: new Date(),
        },
      });

      if (!live) {
        await this.applyPayloadToListingTx(tx, listingId, dto.payload as WizardServerPayload, listing.kind);
      }

      await this.logHistoryTx(tx, listingId, actor.userId, 'draft_save', summary);
    });

    return {
      listingId,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      isPendingRevision,
    };
  }

  async submitDraft(listingId: number, dto: SubmitWizardDraftDto, actor: ActorContext) {
    const listing = await this.requireWizardListing(listingId, actor);
    if (listing.draftVersion !== dto.expectedVersion) {
      throw new ConflictException({
        message: 'Черновик был изменён в другой вкладке',
        currentVersion: listing.draftVersion,
      });
    }

    const mod = await this.getModerationConfig();
    let action = dto.publishAction;
    if (
      mod.enabled &&
      actor.role === 'agent' &&
      (action === 'publish' || action === 'submit_review')
    ) {
      action = 'submit_review';
    }

    await this.saveDraft(
      listingId,
      { payload: dto.payload, expectedVersion: dto.expectedVersion, wizardStep: 4 },
      actor,
    );

    const live = isLiveListingVisibility(listing.visibility);
    if (live || (await this.prisma.listingWizardSnapshot.findUnique({ where: { listingId } }))?.isPendingRevision) {
      await this.applyPayloadToListing(listingId, dto.payload as WizardServerPayload);
      await this.prisma.listingWizardSnapshot.update({
        where: { listingId },
        data: { isPendingRevision: false },
      });
    }

    if (dto.payload.ownerMode === 'agent' && dto.payload.ownerUserId) {
      await this.governance.assignOwner(listingId, dto.payload.ownerUserId, actor);
    }

    const lifecycleAction =
      action === 'publish'
        ? 'publish'
        : action === 'archive'
          ? 'archive'
          : action === 'submit_review'
            ? 'submit_review'
            : 'draft';

    await this.governance.applyLifecycle(listingId, lifecycleAction, actor);
    await this.logHistory(listingId, actor.userId, `submit_${lifecycleAction}`, {
      publishAction: action,
    });

    return this.getDraft(listingId, actor);
  }

  async applyModeration(
    listingId: number,
    action: 'approve' | 'reject',
    actor: ActorContext,
    note?: string,
  ) {
    if (!['admin', 'manager', 'editor'].includes(actor.role)) {
      throw new ForbiddenException('Модерация доступна admin/manager/editor');
    }

    const listing = await this.requireWizardListing(listingId, actor);
    const snap = await this.prisma.listingWizardSnapshot.findUnique({ where: { listingId } });

    if (action === 'approve') {
      if (snap?.isPendingRevision && snap.payload) {
        await this.applyPayloadToListing(listingId, snap.payload as WizardServerPayload);
        await this.prisma.listingWizardSnapshot.update({
          where: { listingId },
          data: { isPendingRevision: false },
        });
      }
      await this.governance.applyLifecycle(listingId, 'approve', actor);
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { moderationNote: null },
      });
      await this.logHistory(listingId, actor.userId, 'moderation_approve', {});
    } else {
      await this.governance.applyLifecycle(listingId, 'reject', actor);
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { moderationNote: note?.trim() || null },
      });
      await this.logHistory(listingId, actor.userId, 'moderation_reject', {}, note);
    }

    return this.getDraft(listingId, actor);
  }

  async getEditHistory(listingId: number, actor: ActorContext, limit = 30) {
    await this.requireWizardListing(listingId, actor);
    return this.getEditHistoryPublic(listingId, limit);
  }

  /** Public payload builder for moderation diff (live listing state). */
  async getListingPayload(listingId: number): Promise<WizardServerPayload> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        apartment: true,
        house: true,
        land: true,
        commercial: true,
        parking: true,
        seller: true,
        ownerUser: { select: { id: true } },
      },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    return this.buildPayloadFromListing(listing as Awaited<ReturnType<typeof this.requireWizardListing>>);
  }

  async getEditHistoryPublic(listingId: number, limit = 30) {
    return this.prisma.listingEditHistory.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  private emptyPayload(regionId: number, kind: ListingWizardUiKind, userId: string): WizardServerPayload {
    return {
      kind,
      regionId,
      blockId: '',
      address: '',
      lat: '',
      lng: '',
      price: '',
      ownerUserId: userId,
      ownerMode: 'self',
      publishAction: 'draft',
      apartment: {},
      house: {},
      land: {},
      commercial: {},
      parking: {},
      mainPhotoUrl: '',
      extraPhotoUrls: [],
      planUrl: '',
      seller: { fullName: '', phone: '', email: '', address: '' },
    };
  }

  private async requireWizardListing(listingId: number, actor: ActorContext) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        apartment: true,
        house: true,
        land: true,
        commercial: true,
        parking: true,
        seller: true,
        ownerUser: { select: { id: true } },
      },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    if (listing.dataSource !== 'MANUAL') {
      throw new ForbiddenException('Мастер доступен только для ручных объявлений');
    }
    this.governance.assertAgentCanManage(listing, actor.userId, actor.role);
    return listing;
  }

  private inferUiKind(listing: {
    kind: string;
    apartment?: { roomTypeId?: number | null } | null;
    wizardSnapshot?: { payload: unknown } | null;
  }): ListingWizardUiKind {
    const snapKind = (listing.wizardSnapshot?.payload as WizardServerPayload | undefined)?.kind;
    if (snapKind && UI_KINDS.includes(snapKind)) return snapKind;
    if (listing.kind === 'APARTMENT') return 'APARTMENT';
    if (listing.kind === 'HOUSE') return 'HOUSE';
    if (listing.kind === 'LAND') return 'LAND';
    if (listing.kind === 'COMMERCIAL') return 'COMMERCIAL';
    return 'PARKING';
  }

  private async buildPayloadFromListing(listing: Awaited<ReturnType<typeof this.requireWizardListing>>): Promise<WizardServerPayload> {
    const uiKind = this.inferUiKind(listing);
    const extraFromJson = (raw: unknown): string[] => {
      if (!Array.isArray(raw)) return [];
      return raw.filter((u): u is string => typeof u === 'string').slice(0, 24);
    };

    let mainPhotoUrl = '';
    let planUrl = '';
    let extraPhotoUrls: string[] = [];

    if (listing.apartment) {
      mainPhotoUrl = listing.apartment.finishingPhotoUrl ?? '';
      planUrl = listing.apartment.planUrl ?? '';
      extraPhotoUrls = extraFromJson(listing.apartment.extraPhotoUrls);
    } else if (listing.house) {
      mainPhotoUrl = listing.house.photoUrl ?? '';
      extraPhotoUrls = extraFromJson(listing.house.extraPhotoUrls);
    } else if (listing.land) {
      mainPhotoUrl = listing.land.photoUrl ?? '';
      extraPhotoUrls = extraFromJson(listing.land.extraPhotoUrls);
    } else if (listing.commercial) {
      mainPhotoUrl = listing.commercial.photoUrl ?? '';
      extraPhotoUrls = extraFromJson(listing.commercial.extraPhotoUrls);
    } else if (listing.parking) {
      mainPhotoUrl = listing.parking.photoUrl ?? '';
      extraPhotoUrls = extraFromJson(listing.parking.extraPhotoUrls);
    }

    const ownerMode: WizardServerPayload['ownerMode'] = listing.ownerUserId
      ? listing.ownerUserId === listing.ownerUser?.id
        ? 'self'
        : 'agent'
      : 'agency';

    return {
      kind: uiKind,
      regionId: listing.regionId,
      blockId: listing.blockId != null ? String(listing.blockId) : '',
      address: listing.address ?? '',
      lat: dec(listing.lat?.toString()),
      lng: dec(listing.lng?.toString()),
      price: dec(listing.price?.toString()),
      ownerUserId: listing.ownerUserId,
      ownerMode,
      publishAction:
        listing.visibility === 'PUBLIC'
          ? 'publish'
          : listing.visibility === 'ARCHIVED'
            ? 'archive'
            : listing.visibility === 'REVIEW'
              ? 'submit_review'
              : 'draft',
      apartment: listing.apartment
        ? {
            blockAddress: listing.apartment.blockAddress ?? '',
            marketSegment: listing.apartment.marketSegment ?? 'auto',
            areaTotal: dec(listing.apartment.areaTotal?.toString()),
            areaKitchen: dec(listing.apartment.areaKitchen?.toString()),
            floor: listing.apartment.floor != null ? String(listing.apartment.floor) : '',
            floorsTotal:
              listing.apartment.floorsTotal != null ? String(listing.apartment.floorsTotal) : '',
            roomTypeId:
              listing.apartment.roomTypeId != null ? String(listing.apartment.roomTypeId) : '',
            finishingId:
              listing.apartment.finishingId != null ? String(listing.apartment.finishingId) : '',
            buildingName: listing.apartment.buildingName ?? '',
            number: listing.apartment.number ?? '',
          }
        : {},
      house: listing.house
        ? {
            houseType: listing.house.houseType ?? '',
            material: listing.house.material ?? '',
            areaTotal: dec(listing.house.areaTotal?.toString()),
            areaLand: dec(listing.house.areaLand?.toString()),
            floorsCount:
              listing.house.floorsCount != null ? String(listing.house.floorsCount) : '',
            bedrooms: listing.house.bedrooms != null ? String(listing.house.bedrooms) : '',
            bathrooms: listing.house.bathrooms != null ? String(listing.house.bathrooms) : '',
            settlement: listing.house.settlement ?? '',
            street: listing.house.street ?? '',
            houseNumber: listing.house.houseNumber ?? '',
            districtName: listing.house.districtName ?? '',
            description: listing.description ?? '',
            yearBuilt:
              listing.house.yearBuilt != null ? String(listing.house.yearBuilt) : '',
            hasGarage: listing.house.hasGarage ?? false,
          }
        : {},
      land: listing.land
        ? {
            areaSotki: dec(listing.land.areaSotki?.toString()),
            landCategory: listing.land.landCategory ?? '',
            cadastralNumber: listing.land.cadastralNumber ?? '',
            hasCommunications: listing.land.hasCommunications ?? false,
          }
        : {},
      commercial: listing.commercial
        ? {
            commercialType: listing.commercial.commercialType ?? '',
            area: dec(listing.commercial.area?.toString()),
            floor: listing.commercial.floor != null ? String(listing.commercial.floor) : '',
            hasSeparateEntrance: listing.commercial.hasSeparateEntrance ?? false,
          }
        : {},
      parking: listing.parking
        ? {
            parkingType: listing.parking.parkingType ?? '',
            area: dec(listing.parking.area?.toString()),
            floor: listing.parking.floor != null ? String(listing.parking.floor) : '',
            number: listing.parking.number ?? '',
          }
        : {},
      mainPhotoUrl,
      extraPhotoUrls,
      planUrl,
      seller: {
        fullName: listing.seller?.fullName ?? '',
        phone: listing.seller?.phone ?? '',
        email: listing.seller?.email ?? '',
        address: listing.seller?.address ?? '',
      },
    };
  }

  private num(s: string): number | undefined {
    const t = s.trim().replace(/\s/g, '').replace(',', '.');
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }

  private intNum(s: string): number | undefined {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : undefined;
  }

  private async applyPayloadToListing(listingId: number, payload: WizardServerPayload) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { kind: true },
    });
    if (!listing) return;
    await this.applyPayloadToListingTx(this.prisma, listingId, payload, listing.kind);
  }

  private async applyPayloadToListingTx(
    tx: Prisma.TransactionClient | PrismaService,
    listingId: number,
    payload: WizardServerPayload,
    currentKind: string,
  ) {
    if (!payload.kind || !payload.regionId) return;
    const apiKind = resolveWizardApiKind(payload.kind);
    const price = this.num(payload.price);
    const blockId = this.intNum(payload.blockId);
    const lat = this.num(payload.lat);
    const lng = this.num(payload.lng);

    const listingPatch: Prisma.ListingUpdateInput = {
      lastActivityAt: new Date(),
      region: { connect: { id: payload.regionId } },
      ...(price != null ? { price: new Prisma.Decimal(price) } : {}),
      ...(payload.address.trim() ? { address: payload.address.trim() } : {}),
      ...(lat != null ? { lat: new Prisma.Decimal(lat) } : {}),
      ...(lng != null ? { lng: new Prisma.Decimal(lng) } : {}),
      kind: apiKind,
      ...(blockId != null ? { block: { connect: { id: blockId } } } : { block: { disconnect: true } }),
    };

    if (apiKind === 'APARTMENT') {
      const a = payload.apartment;
      const areaTotal = this.num(strField(a.areaTotal));
      if (areaTotal == null) return;
      let roomTypeId = this.intNum(strField(a.roomTypeId)) ?? null;
      if (payload.kind === 'ROOM') {
        const roomRows = await tx.roomType.findMany({
          select: { id: true, name: true, nameOne: true, crmId: true },
        });
        const roomListingIds = resolveRoomListingTypeIds(
          roomRows.map((rt) => ({
            id: rt.id,
            name: rt.name,
            nameOne: rt.nameOne,
            crmId: rt.crmId,
          })),
        );
        if (roomListingIds.length) roomTypeId = roomListingIds[0]!;
      }
      await tx.listing.update({
        where: { id: listingId },
        data: {
          ...listingPatch,
          apartment: {
            upsert: {
              create: {
                areaTotal: new Prisma.Decimal(areaTotal),
                areaKitchen: this.num(strField(a.areaKitchen)) != null ? new Prisma.Decimal(this.num(strField(a.areaKitchen))!) : null,
                floor: this.intNum(strField(a.floor)) ?? null,
                floorsTotal: this.intNum(strField(a.floorsTotal)) ?? null,
                roomTypeId,
                finishingId: this.intNum(strField(a.finishingId)) ?? null,
                planUrl: payload.planUrl || null,
                finishingPhotoUrl: payload.mainPhotoUrl || null,
                extraPhotoUrls: payload.extraPhotoUrls.length ? payload.extraPhotoUrls : Prisma.DbNull,
                blockAddress: strField(a.blockAddress) || null,
                buildingName: strField(a.buildingName) || null,
                number: strField(a.number) || null,
              },
              update: {
                areaTotal: new Prisma.Decimal(areaTotal),
                areaKitchen: this.num(strField(a.areaKitchen)) != null ? new Prisma.Decimal(this.num(strField(a.areaKitchen))!) : null,
                floor: this.intNum(strField(a.floor)) ?? null,
                floorsTotal: this.intNum(strField(a.floorsTotal)) ?? null,
                roomTypeId,
                finishingId: this.intNum(strField(a.finishingId)) ?? null,
                planUrl: payload.planUrl || null,
                finishingPhotoUrl: payload.mainPhotoUrl || null,
                extraPhotoUrls: payload.extraPhotoUrls.length ? payload.extraPhotoUrls : Prisma.DbNull,
                blockAddress: strField(a.blockAddress) || null,
                buildingName: strField(a.buildingName) || null,
                number: strField(a.number) || null,
              },
            },
          },
        },
      });
      return;
    }

    if (apiKind === 'HOUSE') {
      const h = payload.house;
      const areaTotal = this.num(strField(h.areaTotal));
      await tx.listing.update({
        where: { id: listingId },
        data: {
          ...listingPatch,
          description: strField(h.description) || undefined,
          house: {
            upsert: {
              create: {
                areaTotal: areaTotal != null ? new Prisma.Decimal(areaTotal) : new Prisma.Decimal(1),
                photoUrl: payload.mainPhotoUrl || null,
                extraPhotoUrls: payload.extraPhotoUrls.length ? payload.extraPhotoUrls : Prisma.DbNull,
              },
              update: {
                houseType: (strField(h.houseType) || null) as 'DETACHED' | 'SEMI' | 'TOWNHOUSE' | 'DUPLEX' | null,
                material: strField(h.material) || null,
                areaTotal: areaTotal != null ? new Prisma.Decimal(areaTotal) : undefined,
                areaLand: this.num(strField(h.areaLand)) != null ? new Prisma.Decimal(this.num(strField(h.areaLand))!) : null,
                floorsCount: this.intNum(strField(h.floorsCount)) ?? null,
                bedrooms: this.intNum(strField(h.bedrooms)) ?? null,
                bathrooms: this.intNum(strField(h.bathrooms)) ?? null,
                settlement: strField(h.settlement) || null,
                street: strField(h.street) || null,
                houseNumber: strField(h.houseNumber) || null,
                districtName: strField(h.districtName) || null,
                yearBuilt: this.intNum(strField(h.yearBuilt)) ?? null,
                hasGarage: h.hasGarage === true,
                photoUrl: payload.mainPhotoUrl || null,
                extraPhotoUrls: payload.extraPhotoUrls.length ? payload.extraPhotoUrls : Prisma.DbNull,
              },
            },
          },
        },
      });
      return;
    }

    // Simplified path for other kinds — update listing + kind row photos/area
    await tx.listing.update({ where: { id: listingId }, data: listingPatch });
  }

  private diffSummary(before: WizardServerPayload | undefined, after: WizardServerPayload) {
    const fields: string[] = [];
    if (before?.price !== after.price) fields.push('price');
    if (before?.address !== after.address) fields.push('address');
    if (before?.regionId !== after.regionId) fields.push('region');
    if (JSON.stringify(before?.extraPhotoUrls) !== JSON.stringify(after.extraPhotoUrls)) {
      fields.push('media');
    }
    if (before?.ownerUserId !== after.ownerUserId) fields.push('ownership');
    return { changedFields: fields };
  }

  private async logHistory(
    listingId: number,
    userId: string,
    action: string,
    summary: Record<string, unknown>,
    note?: string,
  ) {
    await this.logHistoryTx(this.prisma, listingId, userId, action, summary, note);
  }

  private async logHistoryTx(
    tx: Prisma.TransactionClient | PrismaService,
    listingId: number,
    userId: string,
    action: string,
    summary: Record<string, unknown>,
    note?: string,
  ) {
    await tx.listingEditHistory.create({
      data: {
        listingId,
        userId,
        action,
        summary: summary as Prisma.InputJsonValue,
        note: note ?? null,
      },
    });
  }
}

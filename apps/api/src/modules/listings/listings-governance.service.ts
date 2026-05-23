import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  applyLifecycleAction,
  isListingStale,
  parseOwnerFromExternalId,
  resolveListingPublicContact,
  type ListingLifecycleAction,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';

type ActorContext = { userId: string; role: string };

@Injectable()
export class ListingsGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  agentExternalIdPrefix(userId: string) {
    return `manual-${userId}-`;
  }

  assertAgentCanManage(
    row: { externalId: string | null; ownerUserId: string | null },
    actorUserId?: string,
    actorRole?: string,
  ) {
    if (actorRole !== 'agent') return;
    if (!actorUserId) throw new BadRequestException('Требуется пользователь агента');
    if (row.ownerUserId && row.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Агент может изменять только свои объявления');
    }
    const pref = this.agentExternalIdPrefix(actorUserId);
    if (!row.ownerUserId && !row.externalId?.startsWith(pref)) {
      throw new ForbiddenException('Агент может изменять только свои объявления');
    }
  }

  applyOwnershipScope(where: Prisma.ListingWhereInput, actor: ActorContext, scope?: string) {
    if (actor.role !== 'agent') return;
    where.dataSource = 'MANUAL';
    if (scope === 'all') return;
    where.OR = [
      { ownerUserId: actor.userId },
      { externalId: { startsWith: this.agentExternalIdPrefix(actor.userId) } },
    ];
  }

  async applyLifecycle(
    id: number,
    action: ListingLifecycleAction,
    actor: ActorContext,
  ) {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, dataSource: true, externalId: true, ownerUserId: true },
    });
    if (!row) throw new NotFoundException('Объявление не найдено');
    if (row.dataSource !== 'MANUAL') {
      throw new BadRequestException('Lifecycle доступен только для MANUAL объявлений');
    }
    this.assertAgentCanManage(row, actor.userId, actor.role);

    const pub = applyLifecycleAction(action);
    return this.prisma.listing.update({
      where: { id },
      data: {
        visibility: pub.visibility,
        status: pub.status,
        isPublished: pub.isPublished,
        publishedAt: pub.publishedAt,
        archivedAt: pub.archivedAt,
        lastActivityAt: new Date(),
      },
      include: {
        ownerUser: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
        region: { select: { id: true, code: true, name: true } },
        apartment: { include: { roomType: true } },
        house: true,
        land: true,
        commercial: true,
        parking: true,
      },
    });
  }

  async assignOwner(id: number, ownerUserId: string, actor: ActorContext) {
    if (!['admin', 'editor', 'manager'].includes(actor.role)) {
      throw new ForbiddenException('Назначение доступно admin/editor/manager');
    }
    const row = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, dataSource: true, externalId: true },
    });
    if (!row) throw new NotFoundException('Объявление не найдено');
    if (row.dataSource !== 'MANUAL') {
      throw new BadRequestException('Назначение доступно только для MANUAL');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true, role: true, isActive: true },
    });
    if (!owner?.isActive || !['agent', 'manager', 'editor', 'admin'].includes(owner.role)) {
      throw new BadRequestException('Выбранный пользователь не может быть владельцем');
    }

    const previousExternalId = row.externalId ?? `listing-${id}`;
    const stripped = previousExternalId.replace(/^manual-[0-9a-f-]{36}-/i, '');
    const externalId = `${this.agentExternalIdPrefix(owner.id)}${stripped || `listing-${id}`}`;

    return this.prisma.listing.update({
      where: { id },
      data: {
        ownerUserId: owner.id,
        externalId,
        lastActivityAt: new Date(),
      },
      include: {
        ownerUser: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async getObservability(actor?: ActorContext) {
    const manualWhere: Prisma.ListingWhereInput = { dataSource: 'MANUAL' };
    if (actor?.role === 'agent') {
      manualWhere.OR = [
        { ownerUserId: actor.userId },
        { externalId: { startsWith: this.agentExternalIdPrefix(actor.userId) } },
      ];
    }

    const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const t0 = Date.now();

    const [
      bySource,
      byVisibility,
      orphanManual,
      unassignedManual,
      staleCount,
      ownershipMismatch,
    ] = await Promise.all([
      this.prisma.listing.groupBy({ by: ['dataSource'], _count: { _all: true } }),
      this.prisma.listing.groupBy({ by: ['visibility'], _count: { _all: true } }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          ownerUserId: null,
          NOT: { externalId: { startsWith: 'manual-' } },
        },
      }),
      this.prisma.listing.count({ where: { ...manualWhere, ownerUserId: null } }),
      this.prisma.listing.count({
        where: {
          ...manualWhere,
          lastActivityAt: { lt: staleCutoff },
          visibility: { in: ['PUBLIC', 'HIDDEN'] },
        },
      }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          ownerUserId: { not: null },
          externalId: { not: null },
        },
      }),
    ]);

    const mismatches = await this.prisma.listing.findMany({
      where: {
        dataSource: 'MANUAL',
        ownerUserId: { not: null },
        externalId: { not: null },
      },
      select: { id: true, externalId: true, ownerUserId: true },
      take: 200,
    });
    const ownershipMismatchCount = mismatches.filter(
      (r) => parseOwnerFromExternalId(r.externalId) !== r.ownerUserId,
    ).length;

    return {
      queryMs: Date.now() - t0,
      bySource: Object.fromEntries(bySource.map((r) => [r.dataSource, r._count._all])),
      byVisibility: Object.fromEntries(byVisibility.map((r) => [r.visibility, r._count._all])),
      orphanManual,
      unassignedManual,
      staleCount,
      ownershipMismatch: ownershipMismatchCount,
      staleThresholdDays: 30,
    };
  }

  enrichPublicContact<T extends Record<string, unknown>>(
    listing: T & {
      dataSource: string;
      builder?: { name?: string | null; phone?: string | null; email?: string | null } | null;
      ownerUser?: {
        id: string;
        fullName?: string | null;
        phone?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
      } | null;
      seller?: { fullName?: string | null; phone?: string | null; email?: string | null } | null;
    },
    authenticated: boolean,
  ) {
    const publicContact = resolveListingPublicContact(listing, { authenticated });
    const seller =
      listing.seller && !authenticated
        ? {
            ...listing.seller,
            email: undefined,
          }
        : listing.seller;
    return { ...listing, seller, publicContact, isStale: isListingStale(listing.lastActivityAt as Date | string | undefined) };
  }

  manualCreateFields(actorUserId?: string, actorRole?: string, opts?: { status?: string; isPublished?: boolean }) {
    const externalId =
      actorRole === 'agent' && actorUserId
        ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
        : `manual-${randomUUID()}`;
    const isPublished = opts?.isPublished ?? false;
    const status = opts?.status ?? 'DRAFT';
    const visibility = isPublished ? 'PUBLIC' : status === 'DRAFT' ? 'DRAFT' : 'HIDDEN';
    return {
      externalId,
      ownerUserId: actorRole === 'agent' && actorUserId ? actorUserId : null,
      visibility: visibility as 'PUBLIC' | 'HIDDEN' | 'ARCHIVED' | 'DRAFT',
      lastActivityAt: new Date(),
    };
  }
}

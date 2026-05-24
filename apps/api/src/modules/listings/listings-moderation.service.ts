import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  diffWizardPayloads,
  isLiveListingVisibility,
  type WizardServerPayload,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ListingsGovernanceService } from './listings-governance.service';
import { ListingsWizardService } from './listings-wizard.service';
import type { ModerationActionDto, QueryModerationQueueDto } from './dto/listings-moderation.dto';

type ActorContext = { userId: string; role: string };

const STALE_REVIEW_HOURS = 48;
const RECENT_APPROVE_DAYS = 14;

@Injectable()
export class ListingsModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governance: ListingsGovernanceService,
    private readonly wizard: ListingsWizardService,
  ) {}

  private assertModerator(role: string) {
    if (!['admin', 'manager', 'editor'].includes(role)) {
      throw new ForbiddenException('Модерация доступна admin/manager/editor');
    }
  }

  async getStats() {
    const staleCutoff = new Date(Date.now() - STALE_REVIEW_HOURS * 60 * 60 * 1000);
    const recentCutoff = new Date(Date.now() - RECENT_APPROVE_DAYS * 24 * 60 * 60 * 1000);

    const [
      reviewCount,
      rejectedCount,
      pendingRevisionCount,
      staleReviewCount,
      recentApprovals,
    ] = await Promise.all([
      this.prisma.listing.count({
        where: { dataSource: 'MANUAL', visibility: 'REVIEW' },
      }),
      this.prisma.listing.count({
        where: { dataSource: 'MANUAL', visibility: 'REJECTED' },
      }),
      this.prisma.listingWizardSnapshot.count({ where: { isPendingRevision: true } }),
      this.prisma.listing.count({
        where: {
          dataSource: 'MANUAL',
          visibility: 'REVIEW',
          lastActivityAt: { lt: staleCutoff },
        },
      }),
      this.prisma.listingEditHistory.findMany({
        where: {
          action: 'moderation_approve',
          createdAt: { gte: recentCutoff },
        },
        select: { listingId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const recentApprovedIds = new Set(recentApprovals.map((r) => r.listingId));
    const latencies: number[] = [];
    for (const row of recentApprovals.slice(0, 50)) {
      const submit = await this.prisma.listingEditHistory.findFirst({
        where: { listingId: row.listingId, action: { in: ['submit_submit_review', 'submit_review'] } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (submit) {
        latencies.push(row.createdAt.getTime() - submit.createdAt.getTime());
      }
    }
    const avgApprovalLatencyMs =
      latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

    return {
      reviewCount,
      rejectedCount,
      pendingRevisionCount,
      recentlyApprovedCount: recentApprovedIds.size,
      staleReviewCount,
      avgApprovalLatencyMs,
      staleReviewHours: STALE_REVIEW_HOURS,
      conflictCount: 0,
    };
  }

  async getQueue(query: QueryModerationQueueDto, actor: ActorContext) {
    this.assertModerator(actor.role);
    const tab = query.tab ?? 'REVIEW';
    const page = query.page ?? 1;
    const perPage = Math.min(query.per_page ?? 20, 100);
    const skip = (page - 1) * perPage;
    const staleCutoff = new Date(Date.now() - STALE_REVIEW_HOURS * 60 * 60 * 1000);
    const recentCutoff = new Date(Date.now() - RECENT_APPROVE_DAYS * 24 * 60 * 60 * 1000);

    let listingIds: number[] | undefined;
    if (tab === 'RECENTLY_APPROVED') {
      const rows = await this.prisma.listingEditHistory.findMany({
        where: { action: 'moderation_approve', createdAt: { gte: recentCutoff } },
        select: { listingId: true },
        distinct: ['listingId'],
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      listingIds = rows.map((r) => r.listingId);
      if (listingIds.length === 0) {
        return { data: [], meta: { page, per_page: perPage, total: 0, total_pages: 0 } };
      }
    }

    const where: Prisma.ListingWhereInput = {
      dataSource: 'MANUAL',
      ...(listingIds ? { id: { in: listingIds } } : {}),
      ...(query.region_id ? { regionId: query.region_id } : {}),
      ...(query.owner_user_id ? { ownerUserId: query.owner_user_id } : {}),
    };

    if (tab === 'REVIEW') {
      where.visibility = 'REVIEW';
      if (query.stale_only) where.lastActivityAt = { lt: staleCutoff };
    } else if (tab === 'REJECTED') {
      where.visibility = 'REJECTED';
    } else if (tab === 'PENDING_REVISION') {
      where.visibility = { in: ['PUBLIC', 'HIDDEN'] };
      where.wizardSnapshot = { isPendingRevision: true };
    } else if (tab === 'RECENTLY_APPROVED') {
      where.visibility = 'PUBLIC';
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        ...(Number.isFinite(Number(q)) ? [{ id: Number(q) }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { lastActivityAt: 'desc' },
        include: {
          region: { select: { id: true, name: true, code: true } },
          ownerUser: { select: { id: true, fullName: true, email: true } },
          wizardSnapshot: {
            select: {
              isPendingRevision: true,
              updatedAt: true,
              updatedByUserId: true,
            },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      address: r.address,
      price: r.price,
      visibility: r.visibility,
      moderationNote: r.moderationNote,
      draftVersion: r.draftVersion,
      lastActivityAt: r.lastActivityAt,
      isPendingRevision: r.wizardSnapshot?.isPendingRevision ?? false,
      isStaleReview:
        r.visibility === 'REVIEW' && r.lastActivityAt != null && r.lastActivityAt < staleCutoff,
      region: r.region,
      ownerUser: r.ownerUser,
      snapshotUpdatedAt: r.wizardSnapshot?.updatedAt ?? null,
    }));

    return {
      data,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage) || 0,
      },
    };
  }

  async getReviewBundle(listingId: number, actor: ActorContext) {
    this.assertModerator(actor.role);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        region: { select: { id: true, name: true, code: true } },
        ownerUser: { select: { id: true, fullName: true, email: true, phone: true } },
        wizardSnapshot: true,
      },
    });
    if (!listing || listing.dataSource !== 'MANUAL') {
      throw new NotFoundException('Объявление не найдено');
    }

    const livePayload = await this.wizard.getListingPayload(listingId);
    const snap = listing.wizardSnapshot;
    const pendingPayload = (snap?.payload as WizardServerPayload | undefined) ?? livePayload;
    const isLive = isLiveListingVisibility(listing.visibility);
    const diff =
      snap?.isPendingRevision || listing.visibility === 'REVIEW' || listing.visibility === 'REJECTED'
        ? diffWizardPayloads(livePayload, pendingPayload)
        : diffWizardPayloads(livePayload, pendingPayload);

    const history = await this.wizard.getEditHistoryPublic(listingId, 50);

    return {
      listing: {
        id: listing.id,
        kind: listing.kind,
        visibility: listing.visibility,
        moderationNote: listing.moderationNote,
        draftVersion: listing.draftVersion,
        isLivePublic: isLive,
        isPendingRevision: snap?.isPendingRevision ?? false,
        region: listing.region,
        ownerUser: listing.ownerUser,
        lastActivityAt: listing.lastActivityAt,
      },
      live: livePayload,
      pending: pendingPayload,
      diff,
      history,
      invariants: {
        publicListingProtected: isLive && (snap?.isPendingRevision ?? false),
        rejectDoesNotDeleteLive: isLive,
        pendingRevisionIsolated: snap?.isPendingRevision ?? false,
      },
    };
  }

  async applyAction(listingId: number, dto: ModerationActionDto, actor: ActorContext) {
    this.assertModerator(actor.role);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, dataSource: true, draftVersion: true, visibility: true },
    });
    if (!listing || listing.dataSource !== 'MANUAL') {
      throw new NotFoundException('Объявление не найдено');
    }

    if (dto.expectedVersion != null && dto.expectedVersion !== listing.draftVersion) {
      throw new ConflictException({
        message: 'Объявление было изменено. Обновите страницу.',
        currentVersion: listing.draftVersion,
      });
    }

    const needsNote = dto.action === 'reject' || dto.action === 'request_changes';
    if (needsNote && !dto.note?.trim()) {
      throw new BadRequestException('Укажите причину отклонения или правок');
    }

    switch (dto.action) {
      case 'approve':
        await this.wizard.applyModeration(listingId, 'approve', actor, dto.note);
        break;
      case 'reject':
        await this.rejectListing(listingId, actor, dto.note!, 'moderation_reject');
        break;
      case 'request_changes':
        await this.rejectListing(listingId, actor, dto.note!, 'moderation_request_changes');
        break;
      case 'archive':
        await this.governance.applyLifecycle(listingId, 'archive', actor);
        await this.prisma.listingEditHistory.create({
          data: {
            listingId,
            userId: actor.userId,
            action: 'moderation_archive',
            summary: {},
            note: dto.note?.trim() || null,
          },
        });
        break;
      case 'restore':
        if (!['REJECTED', 'ARCHIVED'].includes(listing.visibility)) {
          throw new BadRequestException('Восстановление доступно для отклонённых и архивных');
        }
        await this.governance.applyLifecycle(listingId, 'draft', actor);
        await this.prisma.listing.update({
          where: { id: listingId },
          data: { moderationNote: null, lastActivityAt: new Date() },
        });
        await this.prisma.listingEditHistory.create({
          data: {
            listingId,
            userId: actor.userId,
            action: 'moderation_restore',
            summary: { from: listing.visibility },
          },
        });
        break;
      default:
        throw new BadRequestException('Неизвестное действие');
    }

    return this.getReviewBundle(listingId, actor);
  }

  /** Reject: revision-only for live+pending; full reject for REVIEW drafts. */
  private async rejectListing(
    listingId: number,
    actor: ActorContext,
    note: string,
    historyAction: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { wizardSnapshot: true },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');

    const isLive = isLiveListingVisibility(listing.visibility);
    const pending = listing.wizardSnapshot?.isPendingRevision ?? false;

    if (isLive && pending) {
      const livePayload = await this.wizard.getListingPayload(listingId);
      await this.prisma.listingWizardSnapshot.update({
        where: { listingId },
        data: {
          payload: livePayload as unknown as Prisma.InputJsonValue,
          isPendingRevision: false,
        },
      });
      await this.prisma.listing.update({
        where: { id: listingId },
        data: {
          moderationNote: note.trim(),
          draftVersion: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });
      await this.prisma.listingEditHistory.create({
        data: {
          listingId,
          userId: actor.userId,
          action: historyAction,
          summary: { revisionRejected: true, visibilityKept: listing.visibility },
          note: note.trim(),
        },
      });
      return;
    }

    await this.wizard.applyModeration(listingId, 'reject', actor, note);
    if (historyAction === 'moderation_request_changes') {
      await this.prisma.listingEditHistory.create({
        data: {
          listingId,
          userId: actor.userId,
          action: historyAction,
          summary: { visibility: 'REJECTED' },
          note: note.trim(),
        },
      });
    }
  }
}

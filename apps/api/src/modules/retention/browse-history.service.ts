import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RecordBrowseHistoryDto } from './dto/retention.dto';

const MAX_HISTORY = 100;

@Injectable()
export class BrowseHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limit = 50) {
    return this.prisma.userBrowseHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: Math.min(limit, MAX_HISTORY),
    });
  }

  async record(userId: string, dto: RecordBrowseHistoryDto) {
    const kind = dto.entityKind.toUpperCase();
    if (!['LISTING', 'BLOCK'].includes(kind)) {
      return null;
    }

    await this.prisma.userBrowseHistory.upsert({
      where: {
        userId_entityKind_entityId: {
          userId,
          entityKind: kind,
          entityId: dto.entityId,
        },
      },
      create: {
        userId,
        entityKind: kind,
        entityId: dto.entityId,
        title: dto.title?.trim() || null,
      },
      update: {
        viewedAt: new Date(),
        title: dto.title?.trim() || undefined,
      },
    });

    const count = await this.prisma.userBrowseHistory.count({ where: { userId } });
    if (count > MAX_HISTORY) {
      const oldest = await this.prisma.userBrowseHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'asc' },
        take: count - MAX_HISTORY,
        select: { id: true },
      });
      if (oldest.length) {
        await this.prisma.userBrowseHistory.deleteMany({
          where: { id: { in: oldest.map((r) => r.id) } },
        });
      }
    }

    return { ok: true };
  }

  async remove(userId: string, id: string) {
    await this.prisma.userBrowseHistory.deleteMany({ where: { id, userId } });
  }

  async clear(userId: string) {
    await this.prisma.userBrowseHistory.deleteMany({ where: { userId } });
  }
}

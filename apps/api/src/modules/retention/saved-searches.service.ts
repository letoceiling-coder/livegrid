import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  normalizeSavedSearchSignature,
  type SavedSearchParamsJson,
} from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/retention.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  hashParams(paramsJson: SavedSearchParamsJson): string {
    const sig = normalizeSavedSearchSignature(
      paramsJson.params ?? {},
      paramsJson.regionId ?? null,
    );
    return createHash('sha256').update(sig).digest('hex').slice(0, 32);
  }

  async list(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { region: { select: { id: true, name: true, code: true } } },
    });
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    const paramsJson: SavedSearchParamsJson = {
      params: dto.paramsJson.params ?? {},
      regionId: dto.regionId ?? dto.paramsJson.regionId ?? null,
      geo: dto.geoContext ?? dto.paramsJson.geo ?? null,
    };
    const queryHash = this.hashParams(paramsJson);

    const existing = await this.prisma.savedSearch.findUnique({
      where: { userId_queryHash: { userId, queryHash } },
    });

    if (existing && !dto.overwrite) {
      throw new ConflictException({
        message: 'Такой поиск уже сохранён',
        existingId: existing.id,
      });
    }

    if (existing && dto.overwrite) {
      return this.prisma.savedSearch.update({
        where: { id: existing.id },
        data: {
          name: dto.name.trim(),
          paramsJson: paramsJson as unknown as Prisma.InputJsonValue,
          regionId: paramsJson.regionId ?? null,
          geoContext: (paramsJson.geo ?? null) as unknown as Prisma.InputJsonValue,
          alertsEnabled: true,
        },
        include: { region: { select: { id: true, name: true, code: true } } },
      });
    }

    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name.trim(),
        paramsJson: paramsJson as unknown as Prisma.InputJsonValue,
        regionId: paramsJson.regionId ?? null,
        geoContext: (paramsJson.geo ?? null) as unknown as Prisma.InputJsonValue,
        queryHash,
      },
      include: { region: { select: { id: true, name: true, code: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    const row = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Сохранённый поиск не найден');

    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.alertsEnabled != null ? { alertsEnabled: dto.alertsEnabled } : {}),
        ...(dto.alertNewMatches != null ? { alertNewMatches: dto.alertNewMatches } : {}),
        ...(dto.alertPriceDrop != null ? { alertPriceDrop: dto.alertPriceDrop } : {}),
        ...(dto.alertRestored != null ? { alertRestored: dto.alertRestored } : {}),
      },
      include: { region: { select: { id: true, name: true, code: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const res = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new NotFoundException('Сохранённый поиск не найден');
  }

  assertValidParams(paramsJson: SavedSearchParamsJson) {
    if (!paramsJson?.params || typeof paramsJson.params !== 'object') {
      throw new BadRequestException('paramsJson.params обязателен');
    }
  }
}

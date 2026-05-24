import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateFavoriteDto } from '../retention/dto/retention.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        block: { select: { id: true, name: true, slug: true } },
        listing: {
          select: {
            id: true,
            kind: true,
            price: true,
            title: true,
            address: true,
            status: true,
            visibility: true,
            isPublished: true,
            updatedAt: true,
            block: { select: { slug: true } },
          },
        },
        collection: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => {
      const currentPrice = r.listing?.price != null ? Number(r.listing.price) : null;
      const savedPrice = r.priceAtSave != null ? Number(r.priceAtSave) : null;
      let priceChangePct: number | null = null;
      if (currentPrice != null && savedPrice != null && savedPrice > 0) {
        priceChangePct = Math.round(((currentPrice - savedPrice) / savedPrice) * 100);
      }
      return {
        ...r,
        priceChangePct,
        hasPriceDrop: priceChangePct != null && priceChangePct < 0,
      };
    });
  }

  async addBlock(userId: string, blockId: number) {
    try {
      return await this.prisma.favorite.create({
        data: { userId, blockId },
      });
    } catch {
      throw new ConflictException('Already in favorites');
    }
  }

  async addListing(userId: string, listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { price: true },
    });
    try {
      return await this.prisma.favorite.create({
        data: {
          userId,
          listingId,
          priceAtSave: listing?.price ?? null,
        },
      });
    } catch {
      throw new ConflictException('Already in favorites');
    }
  }

  async update(userId: string, id: number, dto: UpdateFavoriteDto) {
    const fav = await this.prisma.favorite.findFirst({ where: { id, userId } });
    if (!fav) throw new NotFoundException('Favorite not found');

    if (dto.collectionId) {
      const col = await this.prisma.userCollection.findFirst({
        where: { id: dto.collectionId, userId },
      });
      if (!col) throw new NotFoundException('Collection not found');
    }

    return this.prisma.favorite.update({
      where: { id },
      data: {
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.collectionId !== undefined ? { collectionId: dto.collectionId } : {}),
      },
    });
  }

  async markViewed(userId: string, id: number) {
    await this.prisma.favorite.updateMany({
      where: { id, userId },
      data: { lastViewedAt: new Date() },
    });
  }

  async remove(userId: string, id: number) {
    await this.prisma.favorite.deleteMany({
      where: { id, userId },
    });
  }

  async ids(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { blockId: true, listingId: true },
    });
    return {
      blockIds: rows.filter((r) => r.blockId != null).map((r) => r.blockId!),
      listingIds: rows.filter((r) => r.listingId != null).map((r) => r.listingId!),
    };
  }
}

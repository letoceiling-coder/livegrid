import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import type { AdminSaveAgentDto } from './dto/ecosystem.dto';

@Injectable()
export class EcosystemAdminAgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agents: EcosystemAgentService,
    private readonly agencies: EcosystemAgencyService,
    private readonly media: MediaService,
  ) {}

  async listAgents(page = 1, perPage = 50, search?: string) {
    const take = Math.min(perPage, 100);
    const q = search?.trim();
    const where = {
      role: 'agent' as const,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          agentProfile: {
            select: {
              id: true,
              slug: true,
              status: true,
              publishedAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = await Promise.all(
      users.map(async (u) => {
        const listingCount = await this.agencies.countPublicListings(u.id);
        return {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          isActive: u.isActive,
          profileId: u.agentProfile?.id ?? null,
          slug: u.agentProfile?.slug ?? null,
          status: u.agentProfile?.status ?? null,
          publishedAt: u.agentProfile?.publishedAt?.toISOString() ?? null,
          listingCount,
          publicUrl: u.agentProfile?.slug ? `/agent/${u.agentProfile.slug}` : null,
        };
      }),
    );

    return {
      data,
      meta: { page, per_page: take, total },
    };
  }

  async getAgent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        agentProfile: true,
      },
    });
    if (!user || user.role !== 'agent') {
      throw new NotFoundException('Пользователь-агент не найден');
    }

    const listingCount = await this.agencies.countPublicListings(userId);
    const profile = user.agentProfile;

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
      },
      profile: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            bio: profile.bio,
            specializations: Array.isArray(profile.specializationsJson)
              ? (profile.specializationsJson as string[])
              : [],
            regionIds: Array.isArray(profile.regionIdsJson)
              ? (profile.regionIdsJson as number[])
              : [],
            status: profile.status,
            showPhone: profile.showPhone,
            showEmail: profile.showEmail,
            moderationNote: profile.moderationNote,
            publishedAt: profile.publishedAt?.toISOString() ?? null,
          }
        : null,
      listingCount,
      publicUrl: profile?.slug ? `/agent/${profile.slug}` : null,
    };
  }

  async saveAgent(userId: string, dto: AdminSaveAgentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'agent') {
      throw new NotFoundException('Пользователь-агент не найден');
    }

    const userData: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
    } = {};
    if (dto.fullName !== undefined) {
      const name = dto.fullName.trim();
      if (!name) throw new BadRequestException('ФИО не может быть пустым');
      userData.fullName = name;
    }
    if (dto.email !== undefined) {
      userData.email = dto.email.trim() || null;
    }
    if (dto.phone !== undefined) {
      userData.phone = dto.phone.trim() || null;
    }
    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userData });
    }

    const hasProfileFields =
      dto.slug !== undefined ||
      dto.bio !== undefined ||
      dto.specializations !== undefined ||
      dto.regionIds !== undefined ||
      dto.showPhone !== undefined ||
      dto.showEmail !== undefined;

    let profile = await this.prisma.agentProfile.findUnique({ where: { userId } });

    if (hasProfileFields || dto.status !== undefined) {
      if (hasProfileFields || !profile) {
        profile = await this.agents.upsertForUser(userId, {
          slug: dto.slug,
          bio: dto.bio,
          specializations: dto.specializations,
          regionIds: dto.regionIds,
          showPhone: dto.showPhone,
          showEmail: dto.showEmail,
        });
      }
      if (dto.status !== undefined && profile) {
        profile = await this.agents.setStatus(profile.id, dto.status);
      }
    }

    return this.getAgent(userId);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не передан');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'agent') {
      throw new NotFoundException('Пользователь-агент не найден');
    }
    const saved = await this.media.saveUploadedFile(file, undefined, userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: saved.url },
    });
    return { avatarUrl: saved.url };
  }
}

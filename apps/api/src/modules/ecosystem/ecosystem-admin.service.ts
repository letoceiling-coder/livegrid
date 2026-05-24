import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import type { AdminBrandingModerationDto } from './dto/ecosystem.dto';

@Injectable()
export class EcosystemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agencies: EcosystemAgencyService,
    private readonly agents: EcosystemAgentService,
  ) {}

  async listProfiles(page = 1, perPage = 30) {
    const take = Math.min(perPage, 50);
    const [agencies, agents, pendingReview] = await Promise.all([
      this.prisma.agencyProfile.findMany({
        skip: (page - 1) * take,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { fullName: true, email: true, role: true } } },
      }),
      this.prisma.agentProfile.findMany({
        skip: (page - 1) * take,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { fullName: true, email: true, role: true } } },
      }),
      this.prisma.agencyProfile.count({
        where: { status: 'DRAFT', OR: [{ logoUrl: { not: null } }, { bannerUrl: { not: null } }] },
      }),
    ]);

    return {
      agencies,
      agents,
      pendingBrandingReview: pendingReview,
      meta: { page, per_page: take },
    };
  }

  async setAgencyStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED', note?: string) {
    const row = await this.prisma.agencyProfile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Профиль агентства не найден');
    return this.agencies.setStatus(id, status, note);
  }

  async setAgentStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED', note?: string) {
    const row = await this.prisma.agentProfile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Профиль агента не найден');
    return this.agents.setStatus(id, status, note);
  }

  async moderateAgencyBranding(id: string, dto: AdminBrandingModerationDto) {
    const row = await this.prisma.agencyProfile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Профиль агентства не найден');
    return this.prisma.agencyProfile.update({
      where: { id },
      data: {
        logoUrl: dto.logoUrl === null ? null : dto.logoUrl?.trim() ?? undefined,
        bannerUrl: dto.bannerUrl === null ? null : dto.bannerUrl?.trim() ?? undefined,
        themeKey: dto.themeKey ?? undefined,
        moderationNote: dto.moderationNote?.trim() || undefined,
      },
    });
  }
}

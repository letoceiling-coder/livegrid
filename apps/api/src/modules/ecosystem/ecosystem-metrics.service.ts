import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EcosystemDiscoveryService } from './ecosystem-discovery.service';

@Injectable()
export class EcosystemMetricsService {
  private profileLoadCount = 0;
  private lastProfileLoadMs = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: EcosystemDiscoveryService,
  ) {}

  recordProfileLoad(ms: number) {
    this.profileLoadCount += 1;
    this.lastProfileLoadMs = ms;
  }

  async getDebugMetrics() {
    const [publishedAgencies, publishedAgents, suspendedAgencies, suspendedAgents] = await Promise.all([
      this.prisma.agencyProfile.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.agentProfile.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.agencyProfile.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.agentProfile.count({ where: { status: 'SUSPENDED' } }),
    ]);

    const discoveryObs = this.discovery.getObservability();

    return {
      publishedAgencies,
      publishedAgents,
      suspendedProfiles: suspendedAgencies + suspendedAgents,
      profileLoads: this.profileLoadCount,
      lastProfileLoadMs: this.lastProfileLoadMs,
      discovery: discoveryObs,
    };
  }
}

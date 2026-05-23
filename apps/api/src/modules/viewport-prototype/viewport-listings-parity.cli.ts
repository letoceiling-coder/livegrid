#!/usr/bin/env npx tsx
/** Iter 24 — viewport listings parity re-baseline CLI */
import { PrismaClient } from '@prisma/client';
import { ListingsGovernanceService } from '../listings/listings-governance.service';
import { ListingsService } from '../listings/listings.service';
import { GeoSpatialService } from '../geo/geo-spatial.service';
import { GeoPresetsService } from '../geo/geo-presets.service';
import { ViewportListingsParityService } from './viewport-listings-parity.service';

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const presets = new GeoPresetsService();
    const geo = new GeoSpatialService(prisma as never, presets);
    const governance = new ListingsGovernanceService(prisma as never);
    const listings = new ListingsService(prisma as never, geo, governance);
    const parity = new ViewportListingsParityService(prisma as never, listings);
    const report = await parity.runRebaseline(1);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

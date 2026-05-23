#!/usr/bin/env npx tsx
/** Iter 23 — Belgorod review session completion CLI */
import { PrismaClient } from '@prisma/client';
import { LegacyGeoReviewService } from './legacy-geo-review.service';
import { GeoResolverService } from './geo-resolver.service';

async function main() {
  const reviewer = process.argv[2] ?? 'iter23-belgorod-session';
  const prisma = new PrismaClient();
  await prisma.$connect();

  const svc = new LegacyGeoReviewService(
    prisma as never,
    new GeoResolverService(),
  );

  const before = await svc.collectStats();
  const result = await svc.completeBelgorodReviewSession(reviewer);
  const after = await svc.collectStats();
  const csv = await svc.exportReviewCsv();

  console.log('=== Belgorod Review Session ===');
  console.log(JSON.stringify({ before, result, after }, null, 2));
  console.log('\n--- CSV preview (first 5 lines) ---');
  console.log(csv.split('\n').slice(0, 6).join('\n'));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

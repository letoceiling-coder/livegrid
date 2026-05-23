#!/usr/bin/env npx tsx
/** Iter 23 — Staging materialization job CLI */
import { PrismaClient } from '@prisma/client';
import { GeoMaterializationJobService } from './geo-materialization-job.service';
import { GeoResolverService } from './geo-resolver.service';

function parseArgs(argv: string[]) {
  let dryRun = false;
  let regionId = 1;
  let maxBatches: number | undefined;
  let rollback: string | undefined;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--region=')) regionId = Number(arg.slice(9));
    else if (arg.startsWith('--max-batches=')) maxBatches = Number(arg.slice(14));
    else if (arg.startsWith('--rollback=')) rollback = arg.slice(11);
  }
  return { dryRun, regionId, maxBatches, rollback };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  await prisma.$connect();

  const job = new GeoMaterializationJobService(prisma as never, new GeoResolverService());

  if (args.rollback) {
    const report = await job.rollbackRun(args.rollback);
    console.log(JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    return;
  }

  const report = await job.runJob({
    regionId: args.regionId,
    dryRun: args.dryRun,
    maxBatches: args.maxBatches,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!args.dryRun) {
    const obs = await job.collectObservability(args.regionId);
    const parity = await job.validateResolverParity(args.regionId);
    console.log('\n--- Observability ---');
    console.log(JSON.stringify({ obs, parity }, null, 2));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

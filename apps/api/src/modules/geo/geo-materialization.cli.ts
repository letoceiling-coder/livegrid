#!/usr/bin/env npx tsx
/**
 * normalize-listing-geo --dry-run
 * Read-only shadow materialization report (Iter 21). Zero DB writes.
 *
 * Usage:
 *   npx tsx src/modules/geo/geo-materialization.cli.ts
 *   npx tsx src/modules/geo/geo-materialization.cli.ts --region=1
 *   npx tsx src/modules/geo/geo-materialization.cli.ts --max-rows=5000 --json > report.json
 */
import { PrismaClient } from '@prisma/client';
import { GeoMaterializationDryRunService } from './geo-materialization-dry-run.service';
import { GeoResolverService } from './geo-resolver.service';
import { serializeDryRunReport } from './geo-materialization-report';

function parseArgs(argv: string[]) {
  let regionId: number | undefined;
  let maxRows: number | undefined;
  let batchSize: number | undefined;
  let json = false;

  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg.startsWith('--region=')) regionId = Number(arg.slice(9));
    else if (arg.startsWith('--max-rows=')) maxRows = Number(arg.slice(11));
    else if (arg.startsWith('--batch-size=')) batchSize = Number(arg.slice(13));
    else if (arg === '--dry-run' || arg === '--help') continue;
    else if (arg.startsWith('-')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  return { regionId, maxRows, batchSize, json };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    const service = new GeoMaterializationDryRunService(
      prisma as unknown as import('../../prisma/prisma.service').PrismaService,
      new GeoResolverService(),
    );

    const report = await service.runDryRun({
      regionId: args.regionId,
      maxRows: args.maxRows,
      batchSize: args.batchSize,
    });

    if (args.json) {
      console.log(serializeDryRunReport(report));
    } else {
      printHumanSummary(report);
    }

    if (!report.schemaUnchanged) {
      console.error('\nFATAL: schema counts changed during dry-run — abort');
      process.exit(2);
    }

    process.exit(report.goNoGo === 'NO_GO' ? 1 : 0);
  } finally {
    await prisma.$disconnect();
  }
}

function printHumanSummary(report: Awaited<ReturnType<GeoMaterializationDryRunService['runDryRun']>>) {
  const m = report.aggregate;
  console.log('=== normalize-listing-geo --dry-run ===');
  console.log(`readOnly=${report.readOnly} hash=${report.reportHash}`);
  console.log(`processed=${m.totalProcessed} duration=${report.performance.durationMs}ms`);
  console.log('');
  console.log('Aggregate metrics:');
  console.log(`  WOULD_WRITE_BUILDING  ${m.WOULD_WRITE_BUILDING}`);
  console.log(`  WOULD_WRITE_BLOCK     ${m.WOULD_WRITE_BLOCK}`);
  console.log(`  EXACT_PRESERVED       ${m.EXACT_PRESERVED}`);
  console.log(`  SHADOW_UNCLASSIFIED   ${m.SHADOW_UNCLASSIFIED}`);
  console.log(`  INVALID               ${m.INVALID}`);
  console.log(`  MISSING               ${m.MISSING}`);
  console.log(`  DANGEROUS_OVERWRITE   ${m.DANGEROUS_OVERWRITE}`);
  console.log(`  LINEAGE_CONFLICT      ${m.LINEAGE_CONFLICT}`);
  console.log(`  UNCHANGED             ${m.UNCHANGED}`);
  console.log(`  EXACT_DOWNGRADE_BLK   ${m.EXACT_DOWNGRADE_BLOCKED}`);
  console.log('');
  console.log('Schema snapshot (before = after):');
  console.log(`  geo_source=${report.schemaBefore.withGeoSource}`);
  console.log(`  geo_quality=${report.schemaBefore.withGeoQuality}`);
  console.log(`  lat/lng=${report.schemaBefore.withLatLng}`);
  console.log(`  lineage_populated=${report.schemaBefore.lineagePopulated}`);
  console.log(`  schemaUnchanged=${report.schemaUnchanged}`);
  console.log('');
  console.log(`GO/NO-GO: ${report.goNoGo}`);
  for (const r of report.goNoGoReasons) console.log(`  - ${r}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

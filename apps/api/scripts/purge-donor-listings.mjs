#!/usr/bin/env node
/**
 * Remove listings imported from Avangard donor seed (externalId starts with "donor:").
 * Usage: node apps/api/scripts/purge-donor-listings.mjs [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  const where = { externalId: { startsWith: 'donor:' } };
  const count = await prisma.listing.count({ where });
  console.log(`Found ${count} donor listings (externalId donor:*)`);
  if (count === 0) {
    await prisma.$disconnect();
    return;
  }
  if (dryRun) {
    console.log('Dry run — no rows deleted.');
    await prisma.$disconnect();
    return;
  }
  const ids = (await prisma.listing.findMany({ where, select: { id: true } })).map((r) => r.id);
  const chunk = 200;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunk) {
    const batch = ids.slice(i, i + chunk);
    const r = await prisma.listing.deleteMany({ where: { id: { in: batch } } });
    deleted += r.count;
    console.log(`Deleted ${deleted}/${ids.length}…`);
  }
  console.log(`Done. Removed ${deleted} listings.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

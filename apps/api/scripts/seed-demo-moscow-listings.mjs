#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Idempotent demo listings for homepage filter QA (Iter 86).
 * Usage:
 *   cd apps/api
 *   DATABASE_URL=... node scripts/seed-demo-moscow-listings.mjs
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EXTERNAL_PREFIX = 'demo:iter86:';

const DEMOS = [
  {
    key: 'house',
    kind: 'HOUSE',
    title: 'Дом на ул. Тестовая 1',
    address: 'Москва, ул. Тестовая 1',
    price: 15_000_000,
    house: {
      material: 'Кирпич',
      areaTotal: 150,
      areaLand: 8,
      settlement: 'Москва',
      street: 'ул. Тестовая',
      houseNumber: '1',
      districtName: 'Центральный',
    },
  },
  {
    key: 'land',
    kind: 'LAND',
    title: 'Участок 10 сот. ИЖС',
    address: 'Москва, ул. Тестовая 2',
    price: 3_000_000,
    land: {
      areaSotki: 10,
      landCategory: 'ИЖС',
    },
  },
  {
    key: 'commercial',
    kind: 'COMMERCIAL',
    title: 'Офис 80 м²',
    address: 'Москва, ул. Тестовая 3',
    price: 12_000_000,
    commercial: {
      commercialType: 'OFFICE',
      area: 80,
      floor: 3,
    },
  },
];

async function main() {
  const region = await prisma.feedRegion.findFirst({
    where: { OR: [{ code: 'msk' }, { name: { contains: 'Москва', mode: 'insensitive' } }] },
  });
  if (!region) {
    console.error('MSK region not found — skip seed');
    process.exit(1);
  }

  for (const demo of DEMOS) {
    const externalId = `${DEMO_EXTERNAL_PREFIX}${demo.key}`;
    const existing = await prisma.listing.findFirst({ where: { externalId } });
    if (existing) {
      console.log(`  skip ${demo.key} (exists id=${existing.id})`);
      continue;
    }

    const base = {
      externalId,
      regionId: region.id,
      kind: demo.kind,
      title: demo.title,
      address: demo.address,
      price: new Prisma.Decimal(demo.price),
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      isPublished: true,
      dataSource: 'MANUAL',
    };

    if (demo.kind === 'HOUSE') {
      await prisma.listing.create({
        data: {
          ...base,
          house: { create: demo.house },
        },
      });
    } else if (demo.kind === 'LAND') {
      await prisma.listing.create({
        data: {
          ...base,
          land: { create: demo.land },
        },
      });
    } else {
      await prisma.listing.create({
        data: {
          ...base,
          commercial: { create: demo.commercial },
        },
      });
    }
    console.log(`  created ${demo.key}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

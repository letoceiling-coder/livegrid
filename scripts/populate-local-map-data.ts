/**
 * Populate lg_development with a small realistic map dataset.
 *
 * Source: public read-only catalog API at https://livegrid.ru/api/v1
 * (NOT production DB, NOT TrendAgent direct — TrendAgent returns 403 from this network).
 *
 * Usage:
 *   cd ~/livegrid && set -a && source .env && set +a && npx tsx scripts/populate-local-map-data.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const PROD_CATALOG = 'https://livegrid.ru/api/v1';
const MSK_REGION_ID = 1;
const BLOCKS_TO_MIRROR = 10;
const LISTINGS_PER_BLOCK = 2;

function assertLocalDb(url: string | undefined): void {
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!url.includes('lg_development')) {
    throw new Error(`Refusing to write: DATABASE_URL must target lg_development, got: ${url}`);
  }
  if (url.includes('lg_production')) {
    throw new Error('Refusing to write: production database detected');
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PROD_CATALOG}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}

type ProdBlock = {
  externalId: string;
  slug: string;
  name: string;
  description?: string | null;
  status: string;
  latitude: string | number;
  longitude: string | number;
  district?: { id: number; name: string } | null;
  addresses?: { address: string; sortOrder: number }[];
  subways?: { subwayId: number; distanceTime: number; distanceType: number; subway: { name: string } }[];
  images?: { url: string; kind: string; sortOrder: number }[];
  listingPriceMin?: number;
};

type ProdDistrict = { id: number; name: string; externalId?: string | null };
type ProdSubway = { id: number; name: string; externalId?: string | null };

const prisma = new PrismaClient();

async function mirrorReferenceData(): Promise<{ districtByProdId: Map<number, number>; subwayByProdId: Map<number, number> }> {
  const districts = await fetchJson<ProdDistrict[]>(`/districts?region_id=${MSK_REGION_ID}`);
  const subways = await fetchJson<ProdSubway[]>(`/subways?region_id=${MSK_REGION_ID}`);

  const districtByProdId = new Map<number, number>();
  for (const d of districts.slice(0, 40)) {
    const ext = d.externalId ?? `mirror-district-${d.id}`;
    const row = await prisma.district.upsert({
      where: { regionId_externalId: { regionId: MSK_REGION_ID, externalId: ext } },
      update: { name: d.name },
      create: { regionId: MSK_REGION_ID, externalId: ext, name: d.name },
    });
    districtByProdId.set(d.id, row.id);
  }

  const subwayByProdId = new Map<number, number>();
  for (const s of subways.slice(0, 50)) {
    const ext = s.externalId ?? `mirror-subway-${s.id}`;
    const row = await prisma.subway.upsert({
      where: { regionId_externalId: { regionId: MSK_REGION_ID, externalId: ext } },
      update: { name: s.name },
      create: { regionId: MSK_REGION_ID, externalId: ext, name: s.name },
    });
    subwayByProdId.set(s.id, row.id);
  }

  console.log(`  Reference: ${districtByProdId.size} districts, ${subwayByProdId.size} subways`);
  return { districtByProdId, subwayByProdId };
}

async function mirrorBlocks(
  districtByProdId: Map<number, number>,
  subwayByProdId: Map<number, number>,
): Promise<number[]> {
  const resp = await fetchJson<{ data: ProdBlock[] }>(
    `/blocks?region_id=${MSK_REGION_ID}&per_page=${BLOCKS_TO_MIRROR}&page=1`,
  );
  const blockIds: number[] = [];

  for (const pb of resp.data) {
    if (!pb.latitude || !pb.longitude) continue;

    const districtId =
      pb.district?.id != null ? districtByProdId.get(pb.district.id) ?? null : null;

    const block = await prisma.block.upsert({
      where: {
        regionId_externalId: { regionId: MSK_REGION_ID, externalId: pb.externalId },
      },
      update: {
        name: pb.name,
        slug: `${pb.slug}-local`,
        description: pb.description ?? null,
        districtId,
        latitude: new Prisma.Decimal(String(pb.latitude)),
        longitude: new Prisma.Decimal(String(pb.longitude)),
        status: pb.status === 'COMPLETED' ? 'COMPLETED' : pb.status === 'PROJECT' ? 'PROJECT' : 'BUILDING',
        dataSource: 'FEED',
      },
      create: {
        regionId: MSK_REGION_ID,
        externalId: pb.externalId,
        slug: `${pb.slug}-local`,
        name: pb.name,
        description: pb.description ?? null,
        districtId,
        latitude: new Prisma.Decimal(String(pb.latitude)),
        longitude: new Prisma.Decimal(String(pb.longitude)),
        status: pb.status === 'COMPLETED' ? 'COMPLETED' : pb.status === 'PROJECT' ? 'PROJECT' : 'BUILDING',
        dataSource: 'FEED',
      },
    });

    await prisma.blockAddress.deleteMany({ where: { blockId: block.id } });
    for (const [i, a] of (pb.addresses ?? []).entries()) {
      await prisma.blockAddress.create({
        data: { blockId: block.id, address: a.address, sortOrder: a.sortOrder ?? i },
      });
    }

    await prisma.blockImage.deleteMany({ where: { blockId: block.id } });
    for (const img of (pb.images ?? []).slice(0, 3)) {
      if (typeof img.url === 'string' && img.url.startsWith('http')) {
        await prisma.blockImage.create({
          data: {
            blockId: block.id,
            url: img.url,
            kind: img.kind === 'PLAN' ? 'PLAN' : 'RENDER',
            sortOrder: img.sortOrder ?? 0,
          },
        });
      }
    }

    await prisma.blockSubway.deleteMany({ where: { blockId: block.id } });
    for (const sw of pb.subways ?? []) {
      const subwayId = subwayByProdId.get(sw.subwayId);
      if (subwayId) {
        await prisma.blockSubway.create({
          data: {
            blockId: block.id,
            subwayId,
            distanceTime: sw.distanceTime,
            distanceType: sw.distanceType,
          },
        });
      }
    }

    const basePrice = pb.listingPriceMin && pb.listingPriceMin > 100_000 ? pb.listingPriceMin : 8_000_000;
    for (let i = 0; i < LISTINGS_PER_BLOCK; i++) {
      const ext = `mirror-listing-${pb.externalId}-${i}`;
      const exists = await prisma.listing.findFirst({
        where: { regionId: MSK_REGION_ID, externalId: ext },
      });
      if (exists) continue;

      await prisma.listing.create({
        data: {
          regionId: MSK_REGION_ID,
          kind: 'APARTMENT',
          blockId: block.id,
          externalId: ext,
          price: new Prisma.Decimal(basePrice + i * 500_000),
          currency: 'RUB',
          status: 'ACTIVE',
          dataSource: 'MANUAL',
          isPublished: true,
          publishedAt: new Date(),
          lat: block.latitude,
          lng: block.longitude,
          apartment: {
            create: {
              areaTotal: new Prisma.Decimal(45 + i * 8),
              floor: 3 + i * 4,
              floorsTotal: 22,
              marketSegment: 'NEW_BUILDING',
            },
          },
        },
      });
    }

    blockIds.push(block.id);
    console.log(`  Block: ${pb.name} (id=${block.id})`);
  }

  return blockIds;
}

async function addSecondaryListings(): Promise<void> {
  const coords = [
    { lat: 55.761, lng: 37.620, price: 18_500_000, area: 62 },
    { lat: 55.749, lng: 37.605, price: 14_200_000, area: 48 },
    { lat: 55.770, lng: 37.640, price: 22_000_000, area: 75 },
  ];
  for (const [i, c] of coords.entries()) {
    const ext = `mirror-secondary-${i}`;
    const exists = await prisma.listing.findFirst({
      where: { regionId: MSK_REGION_ID, externalId: ext },
    });
    if (exists) continue;
    await prisma.listing.create({
      data: {
        regionId: MSK_REGION_ID,
        kind: 'APARTMENT',
        externalId: ext,
        price: new Prisma.Decimal(c.price),
        currency: 'RUB',
        status: 'ACTIVE',
        dataSource: 'MANUAL',
        isPublished: true,
        publishedAt: new Date(),
        address: `Москва, тестовая вторичка #${i + 1}`,
        lat: new Prisma.Decimal(c.lat),
        lng: new Prisma.Decimal(c.lng),
        apartment: {
          create: {
            areaTotal: new Prisma.Decimal(c.area),
            floor: 7 + i,
            floorsTotal: 12,
            marketSegment: 'SECONDARY',
          },
        },
      },
    });
  }
  console.log(`  Secondary listings: up to ${coords.length}`);
}

async function main() {
  assertLocalDb(process.env.DATABASE_URL);
  console.log('Populating local map data from public catalog API (read-only)...');
  console.log(`  Target DB: lg_development`);

  const { districtByProdId, subwayByProdId } = await mirrorReferenceData();
  const blockIds = await mirrorBlocks(districtByProdId, subwayByProdId);
  await addSecondaryListings();

  const counts = {
    blocks: await prisma.block.count({ where: { regionId: MSK_REGION_ID } }),
    listings: await prisma.listing.count({ where: { regionId: MSK_REGION_ID } }),
    districts: await prisma.district.count({ where: { regionId: MSK_REGION_ID } }),
    subways: await prisma.subway.count({ where: { regionId: MSK_REGION_ID } }),
  };
  console.log('Done.', counts, `mirrored block ids: [${blockIds.join(', ')}]`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

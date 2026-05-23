import { BlockStatus, ListingKind, ListingStatus, Prisma } from '@prisma/client';

/**
 * Builds a SQL fragment for `WHERE (...)` on alias `b` (table `blocks`).
 * Must stay aligned with {@link BlocksService.buildCatalogBlockWhere} filter semantics.
 * Returns null when the where shape is not SQL-translatable (caller may use Prisma ID fallback).
 */
export function catalogBlockWhereToSql(where: Prisma.BlockWhereInput): Prisma.Sql | null {
  const parts: Prisma.Sql[] = [];

  const allowedTop = new Set([
    'regionId',
    'districtId',
    'builderId',
    'status',
    'isPromoted',
    'slug',
    'id',
    'salesStartDate',
    'OR',
    'AND',
    'subways',
    'district',
    'builder',
    'listings',
  ]);
  for (const k of Object.keys(where)) {
    if ((where as Record<string, unknown>)[k] === undefined) continue;
    if (!allowedTop.has(k)) return null;
  }

  if (where.regionId !== undefined) {
    if (typeof where.regionId !== 'number') return null;
    parts.push(Prisma.sql`b.region_id = ${where.regionId}`);
  }
  if (where.districtId !== undefined) {
    if (typeof where.districtId !== 'number') return null;
    parts.push(Prisma.sql`b.district_id = ${where.districtId}`);
  }
  if (where.builderId !== undefined) {
    if (typeof where.builderId !== 'number') return null;
    parts.push(Prisma.sql`b.builder_id = ${where.builderId}`);
  }
  if (where.status !== undefined) {
    if (typeof where.status !== 'string' || !Object.values(BlockStatus).includes(where.status as BlockStatus)) {
      return null;
    }
    parts.push(Prisma.sql`b.status = ${where.status}::"BlockStatus"`);
  }
  if (where.isPromoted === true) {
    parts.push(Prisma.sql`b.is_promoted = true`);
  }

  if (where.slug !== undefined) {
    const s = where.slug;
    if (!s || typeof s !== 'object' || !('in' in s) || !Array.isArray((s as { in: unknown }).in)) return null;
    const slugs = (s as { in: string[] }).in;
    if (!slugs.length) parts.push(Prisma.sql`FALSE`);
    else parts.push(Prisma.sql`b.slug IN (${Prisma.join(slugs)})`);
  }

  if (where.id !== undefined) {
    const idw = where.id;
    if (!idw || typeof idw !== 'object' || !('in' in idw) || !Array.isArray((idw as { in: unknown }).in)) return null;
    const ids = (idw as { in: number[] }).in;
    if (!ids.length) parts.push(Prisma.sql`FALSE`);
    else parts.push(Prisma.sql`b.id IN (${Prisma.join(ids)})`);
  }

  if (where.salesStartDate !== undefined) {
    const sql = salesStartDateToSql(where.salesStartDate as Prisma.DateTimeNullableFilter);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.district !== undefined) {
    const sql = districtRelationToSql(where.district as Prisma.DistrictWhereInput);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.builder !== undefined) {
    const sql = builderRelationToSql(where.builder as Prisma.BuilderWhereInput);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.subways !== undefined) {
    const sql = subwaysWhereToSql(where.subways);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.listings !== undefined) {
    const sql = listingsSomeToSql(where.listings);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.OR !== undefined) {
    const sql = orClauseGroupToSql(where.OR);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.AND !== undefined) {
    if (!Array.isArray(where.AND)) return null;
    for (const clause of where.AND) {
      const sql = andClauseToSql(clause as Prisma.BlockWhereInput);
      if (sql == null) return null;
      parts.push(sql);
    }
  }

  if (!parts.length) return Prisma.sql`TRUE`;
  return Prisma.join(parts, ' AND ');
}

function andClauseToSql(clause: Prisma.BlockWhereInput): Prisma.Sql | null {
  if (clause.OR !== undefined) {
    return orClauseGroupToSql(clause.OR);
  }
  return catalogBlockWhereToSql(clause);
}

function orClauseGroupToSql(clauses: Prisma.BlockWhereInput[]): Prisma.Sql | null {
  if (!Array.isArray(clauses) || !clauses.length) return null;
  const orParts: Prisma.Sql[] = [];
  for (const clause of clauses) {
    const o = orClauseToSql(clause);
    if (o == null) return null;
    orParts.push(o);
  }
  return Prisma.sql`(${Prisma.join(orParts, ' OR ')})`;
}

function orClauseToSql(clause: Prisma.BlockWhereInput): Prisma.Sql | null {
  const search = searchOrClauseToSql(clause);
  if (search != null) return search;

  if (clause.status === BlockStatus.COMPLETED) {
    return Prisma.sql`b.status = ${BlockStatus.COMPLETED}::"BlockStatus"`;
  }

  if (clause.buildings !== undefined) {
    return buildingsSomeDeadlineToSql(clause.buildings);
  }

  return null;
}

function buildingsSomeDeadlineToSql(b: Prisma.BuildingListRelationFilter): Prisma.Sql | null {
  if (!b.some || typeof b.some !== 'object') return null;
  const some = b.some as { deadlineKey?: { gte?: Date; lt?: Date } };
  const dk = some.deadlineKey;
  if (!dk || typeof dk !== 'object') return null;
  const inner: Prisma.Sql[] = [Prisma.sql`bl.block_id = b.id`];
  if (dk.gte instanceof Date && !Number.isNaN(dk.gte.getTime())) {
    inner.push(Prisma.sql`bl.deadline_key >= ${dk.gte}::date`);
  }
  if (dk.lt instanceof Date && !Number.isNaN(dk.lt.getTime())) {
    inner.push(Prisma.sql`bl.deadline_key < ${dk.lt}::date`);
  }
  if (inner.length === 1) return null;
  return Prisma.sql`EXISTS (SELECT 1 FROM buildings bl WHERE ${Prisma.join(inner, ' AND ')})`;
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function searchOrClauseToSql(clause: Prisma.BlockWhereInput): Prisma.Sql | null {
  const keys = Object.keys(clause).filter((k) => (clause as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1) return null;
  const key = keys[0];

  if (key === 'name') {
    const n = clause.name;
    if (!n || typeof n !== 'object' || !('contains' in n)) return null;
    const q = String((n as { contains: string }).contains).trim();
    if (!q) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(q)}%`;
    return Prisma.sql`b.name ILIKE ${pat} ESCAPE '\\'`;
  }

  if (key === 'addresses') {
    const a = clause.addresses;
    if (!a || typeof a !== 'object' || !('some' in a)) return null;
    const some = (a as { some: { address?: { contains?: string } } }).some;
    const c = some?.address?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_addresses ba
      WHERE ba.block_id = b.id AND ba.address ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'district') {
    const d = clause.district;
    if (!d || typeof d !== 'object' || !('name' in d)) return null;
    const nm = (d as { name?: { contains?: string; in?: string[] } }).name;
    if (nm && 'in' in nm && Array.isArray(nm.in)) {
      if (!nm.in.length) return Prisma.sql`FALSE`;
      return Prisma.sql`EXISTS (
        SELECT 1 FROM districts d3
        WHERE d3.id = b.district_id AND d3.name IN (${Prisma.join(nm.in)})
      )`;
    }
    const c = nm?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM districts d2
      WHERE d2.id = b.district_id AND d2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'builder') {
    const bu = clause.builder;
    if (!bu || typeof bu !== 'object' || !('name' in bu)) return null;
    const nm = (bu as { name?: { contains?: string; in?: string[] } }).name;
    if (nm && 'in' in nm && Array.isArray(nm.in)) {
      if (!nm.in.length) return Prisma.sql`FALSE`;
      return Prisma.sql`EXISTS (
        SELECT 1 FROM builders bu3
        WHERE bu3.id = b.builder_id AND bu3.name IN (${Prisma.join(nm.in)})
      )`;
    }
    const c = nm?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM builders bu2
      WHERE bu2.id = b.builder_id AND bu2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'subways') {
    const su = clause.subways;
    if (!su || typeof su !== 'object' || !('some' in su)) return null;
    const some = (su as { some: { subway?: { name?: { contains?: string } } } }).some;
    const c = some?.subway?.name?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs2
      INNER JOIN subways sw2 ON sw2.id = bs2.subway_id
      WHERE bs2.block_id = b.id AND sw2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  return null;
}

function salesStartDateToSql(f: Prisma.DateTimeNullableFilter): Prisma.Sql | null {
  const allowed = new Set(['not', 'gte', 'lte']);
  for (const k of Object.keys(f)) {
    if ((f as Record<string, unknown>)[k] === undefined) continue;
    if (!allowed.has(k)) return null;
  }
  const parts: Prisma.Sql[] = [Prisma.sql`b.sales_start_date IS NOT NULL`];
  if (f.not !== undefined && f.not !== null) return null;
  if (f.gte !== undefined) {
    if (!(f.gte instanceof Date) || Number.isNaN(f.gte.getTime())) return null;
    parts.push(Prisma.sql`b.sales_start_date >= ${f.gte}::date`);
  }
  if (f.lte !== undefined) {
    if (!(f.lte instanceof Date) || Number.isNaN(f.lte.getTime())) return null;
    parts.push(Prisma.sql`b.sales_start_date <= ${f.lte}::date`);
  }
  return Prisma.join(parts, ' AND ');
}

function districtRelationToSql(d: Prisma.DistrictWhereInput): Prisma.Sql | null {
  const keys = Object.keys(d).filter((k) => (d as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1 || keys[0] !== 'name') return null;
  const nm = d.name as { in?: string[] } | undefined;
  const names = nm?.in;
  if (!Array.isArray(names) || !names.length) return null;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM districts d3
    WHERE d3.id = b.district_id AND d3.name IN (${Prisma.join(names)})
  )`;
}

function builderRelationToSql(bu: Prisma.BuilderWhereInput): Prisma.Sql | null {
  const keys = Object.keys(bu).filter((k) => (bu as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1 || keys[0] !== 'name') return null;
  const nm = bu.name as { in?: string[] } | undefined;
  const names = nm?.in;
  if (!Array.isArray(names) || !names.length) return null;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM builders bu3
    WHERE bu3.id = b.builder_id AND bu3.name IN (${Prisma.join(names)})
  )`;
}

function subwaysWhereToSql(s: Prisma.BlockSubwayListRelationFilter): Prisma.Sql | null {
  if (!s.some || typeof s.some !== 'object') return null;
  const some = s.some as Record<string, unknown>;
  const keys = Object.keys(some).filter((k) => some[k] !== undefined);

  if (keys.length === 1 && keys[0] === 'subwayId' && typeof some.subwayId === 'number') {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs4
      WHERE bs4.block_id = b.id AND bs4.subway_id = ${some.subwayId}
    )`;
  }

  if (keys.length === 1 && keys[0] === 'subway' && some.subway && typeof some.subway === 'object') {
    const sn = (some.subway as { name?: { in?: string[] } }).name?.in;
    if (!Array.isArray(sn) || !sn.length) return null;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs5
      INNER JOIN subways sw5 ON sw5.id = bs5.subway_id
      WHERE bs5.block_id = b.id AND sw5.name IN (${Prisma.join(sn)})
    )`;
  }

  return null;
}

function listingsSomeToSql(l: Prisma.ListingListRelationFilter): Prisma.Sql | null {
  if (!l.some || typeof l.some !== 'object') return null;
  const some = l.some as Record<string, unknown>;
  const keys = Object.keys(some).filter((k) => some[k] !== undefined);

  const statusClause = listingStatusClause(some.status);
  if (statusClause == null) return null;

  if (
    keys.includes('kind') &&
    some.kind === ListingKind.APARTMENT &&
    keys.includes('isPublished') &&
    some.isPublished === true &&
    keys.includes('status')
  ) {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM listings lreq
      WHERE lreq.block_id = b.id
        AND ${statusClause}
        AND lreq.kind = ${ListingKind.APARTMENT}::"ListingKind"
        AND lreq.is_published = true
    )`;
  }

  return null;
}

function listingStatusClause(status: unknown): Prisma.Sql | null {
  if (status === ListingStatus.ACTIVE) {
    return Prisma.sql`lreq.status = ${ListingStatus.ACTIVE}::"ListingStatus"`;
  }
  if (status && typeof status === 'object' && 'in' in status) {
    const arr = (status as { in: ListingStatus[] }).in;
    if (!Array.isArray(arr) || !arr.length) return Prisma.sql`FALSE`;
    return Prisma.sql`lreq.status IN (${Prisma.join(
      arr.map((s) => Prisma.sql`${s}::"ListingStatus"`),
    )})`;
  }
  return null;
}

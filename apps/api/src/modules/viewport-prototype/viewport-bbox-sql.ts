import { Prisma } from '@prisma/client';

/** PostGIS envelope filter on blocks alias `b` (WGS84). */
export function blockBboxEnvelopeSql(
  sw_lat: number,
  sw_lng: number,
  ne_lat: number,
  ne_lng: number,
): Prisma.Sql {
  return Prisma.sql`
    b.latitude IS NOT NULL AND b.longitude IS NOT NULL
    AND ST_Within(
      ST_SetSRID(ST_MakePoint(b.longitude::double precision, b.latitude::double precision), 4326),
      ST_MakeEnvelope(${sw_lng}::float8, ${sw_lat}::float8, ${ne_lng}::float8, ${ne_lat}::float8, 4326)
    )
  `;
}

/** PostGIS envelope filter on listings alias `l` (WGS84). */
export function listingBboxEnvelopeSql(
  sw_lat: number,
  sw_lng: number,
  ne_lat: number,
  ne_lng: number,
): Prisma.Sql {
  return Prisma.sql`
    l.lat IS NOT NULL AND l.lng IS NOT NULL
    AND ST_Within(
      ST_SetSRID(ST_MakePoint(l.lng::double precision, l.lat::double precision), 4326),
      ST_MakeEnvelope(${sw_lng}::float8, ${sw_lat}::float8, ${ne_lng}::float8, ${ne_lat}::float8, 4326)
    )
  `;
}

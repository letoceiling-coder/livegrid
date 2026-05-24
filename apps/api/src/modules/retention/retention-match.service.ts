import { Injectable } from '@nestjs/common';
import type { SavedSearchParamsJson } from '@lg/shared';
import { ListingsService } from '../listings/listings.service';
import { QueryListingsDto } from '../listings/dto/query-listings.dto';

const KIND_BY_OBJECT_TYPE: Record<string, string> = {
  apartments: 'APARTMENT',
  rooms: 'APARTMENT',
  houses: 'HOUSE',
  land: 'LAND',
  dachas: 'HOUSE',
  commercial: 'COMMERCIAL',
};

@Injectable()
export class RetentionMatchService {
  constructor(private readonly listings: ListingsService) {}

  /** Convert saved search JSON → listings query DTO (public visibility enforced). */
  toListingsQuery(paramsJson: SavedSearchParamsJson): QueryListingsDto {
    const p = paramsJson.params ?? {};
    const dto = new QueryListingsDto();

    const objectType = p.type ?? 'apartments';
    dto.kind = KIND_BY_OBJECT_TYPE[objectType] ?? 'APARTMENT';
    dto.region_id = paramsJson.regionId ?? undefined;
    dto.is_published = true;
    dto.statuses = 'ACTIVE,RESERVED';

    if (p.search) dto.search = p.search;
    if (p.price_min) dto.price_min = Number(p.price_min);
    if (p.price_max) dto.price_max = Number(p.price_max);
    if (p.area_min) dto.area_total_min = Number(p.area_min);
    if (p.area_max) dto.area_total_max = Number(p.area_max);
    if (p.floor_min) dto.floor_min = Number(p.floor_min);
    if (p.floor_max) dto.floor_max = Number(p.floor_max);
    if (p.land_area_min) dto.house_land_min = Number(p.land_area_min);
    if (p.land_area_max) dto.house_land_max = Number(p.land_area_max);
    if (p.distance_min) dto.distance_min = Number(p.distance_min);
    if (p.distance_max) dto.distance_max = Number(p.distance_max);
    if (p.rooms) dto.rooms = p.rooms;
    if (p.district_names) dto.district_names = p.district_names;
    if (p.directions) dto.house_directions = p.directions;
    if (p.house_location) dto.house_location = p.house_location;
    if (p.finishing_ids) dto.finishing = p.finishing_ids;

    if (p.market === 'secondary') dto.apartment_market = 'secondary';
    else if (p.market === 'new') dto.apartment_market = 'new_building';

    const geo = paramsJson.geo;
    if (geo?.geo_lat != null) dto.geo_lat = geo.geo_lat;
    if (geo?.geo_lng != null) dto.geo_lng = geo.geo_lng;
    if (geo?.geo_radius_m != null) dto.geo_radius_m = geo.geo_radius_m;
    if (geo?.geo_polygon) dto.geo_polygon = geo.geo_polygon;
    if (geo?.geo_preset) dto.geo_preset = geo.geo_preset;

    return dto;
  }

  /** Find listings matching saved search, optionally after a watermark date. */
  async findMatches(
    paramsJson: SavedSearchParamsJson,
    opts?: { since?: Date; limit?: number },
  ) {
    const query = this.toListingsQuery(paramsJson);
    const perPage = Math.min(opts?.limit ?? 50, 50);
    const result = await this.listings.findAll({
      ...query,
      page: 1,
      per_page: perPage,
      sort: 'created_desc',
    });

    let rows = result.data as Array<{ id: number; price: unknown; createdAt: Date; title: string | null }>;
    if (opts?.since) {
      rows = rows.filter((r) => r.createdAt > opts.since!);
    }
    return rows;
  }
}

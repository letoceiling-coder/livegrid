/** Ответ GET /api/v1/search/suggest — группы как в референсе (ЖК / метро / районы / …). */

export type SuggestComplex = {
  type: 'complex';
  id: string;
  slug: string;
  name: string;
  district: string;
  subway: string;
  image: string;
};

export type SuggestMetro = { type: 'metro'; id: string | number; name: string };
export type SuggestDistrict = { type: 'district'; id: string | number; name: string };
export type SuggestStreet = { type: 'street'; id: string | number; name: string };
export type SuggestBuilder = { type: 'builder'; id: string | number; name: string };

export type SuggestGroupedResponse = {
  complexes: SuggestComplex[];
  metros: SuggestMetro[];
  districts: SuggestDistrict[];
  streets: SuggestStreet[];
  builders: SuggestBuilder[];
};

export function emptySuggestGrouped(): SuggestGroupedResponse {
  return { complexes: [], metros: [], districts: [], streets: [], builders: [] };
}

export function parseSuggestResponse(json: unknown): SuggestGroupedResponse {
  if (!json || typeof json !== 'object') {
    return emptySuggestGrouped();
  }
  const o = json as Record<string, unknown>;
  if (Array.isArray(o)) {
    return legacyFlatArrayToGrouped(o as LegacyFlatItem[]);
  }
  if (!Array.isArray(o.complexes)) {
    return emptySuggestGrouped();
  }
  return {
    complexes: (o.complexes as SuggestComplex[]) ?? [],
    metros: (o.metros as SuggestMetro[]) ?? [],
    districts: (o.districts as SuggestDistrict[]) ?? [],
    streets: (o.streets as SuggestStreet[]) ?? [],
    builders: (o.builders as SuggestBuilder[]) ?? [],
  };
}

type LegacyFlatItem = {
  type?: string;
  id?: string | number;
  slug?: string;
  name?: string;
  district?: string;
  subway?: string;
  image?: string;
};

/** Старый формат: один плоский массив (до группировки). */
function legacyFlatArrayToGrouped(items: LegacyFlatItem[]): SuggestGroupedResponse {
  const out = emptySuggestGrouped();
  for (const raw of items) {
    const t = raw.type;
    if (t === 'complex' && raw.name) {
      out.complexes.push({
        type: 'complex',
        id: String(raw.id ?? ''),
        slug: raw.slug ?? '',
        name: raw.name,
        district: raw.district ?? '',
        subway: raw.subway ?? '',
        image: raw.image ?? '',
      });
    } else if (t === 'metro' && raw.name) {
      out.metros.push({ type: 'metro', id: raw.id ?? '', name: raw.name });
    } else if (t === 'district' && raw.name) {
      out.districts.push({ type: 'district', id: raw.id ?? '', name: raw.name });
    } else if (t === 'street' && raw.name) {
      out.streets.push({ type: 'street', id: raw.id ?? '', name: raw.name });
    } else if (t === 'builder' && raw.name) {
      out.builders.push({ type: 'builder', id: raw.id ?? '', name: raw.name });
    }
  }
  return out;
}

export function suggestTotalCount(g: SuggestGroupedResponse): number {
  return (
    g.complexes.length +
    g.metros.length +
    g.districts.length +
    g.streets.length +
    g.builders.length
  );
}

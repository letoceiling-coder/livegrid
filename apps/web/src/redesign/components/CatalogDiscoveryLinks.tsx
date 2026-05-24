import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, TrainFront, Building2, Home } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { buildCatalogFilterUrl } from '@/redesign/lib/catalog-filter-links';
import type { CatalogLandingContext } from '@/redesign/lib/catalog-landing';

type GraphPayload = {
  relatedDistricts: Array<{ id: number; name: string; listingCount: number; blockCount: number }>;
  relatedSubways: Array<{ id: number; name: string; blockCount: number }>;
  nearbyBlocks: Array<{ id: number; slug: string; name: string; listingCount: number }>;
  roomTypes: Array<{ rooms: number; label: string; count: number }>;
};

type Props = {
  regionId: number | null;
  landing: CatalogLandingContext;
  className?: string;
};

export default function CatalogDiscoveryLinks({ regionId, landing, className = '' }: Props) {
  const enabled = regionId != null && landing.kind !== 'none';

  const graphQuery = useQuery({
    queryKey: ['discovery', 'catalog-landing', regionId, landing.district, landing.subway],
    queryFn: () => {
      const sp = new URLSearchParams({ region_id: String(regionId) });
      if (landing.district) sp.set('district', landing.district);
      if (landing.subway) sp.set('subway', landing.subway);
      return apiGet<GraphPayload>(`/discovery/catalog-landing?${sp.toString()}`);
    },
    enabled,
    staleTime: 120_000,
  });

  if (!enabled || !graphQuery.data) return null;

  const { relatedDistricts, relatedSubways, nearbyBlocks, roomTypes } = graphQuery.data;
  const hasLinks =
    relatedDistricts.length > 0 ||
    relatedSubways.length > 0 ||
    nearbyBlocks.length > 0 ||
    roomTypes.length > 0;

  if (!hasLinks) return null;

  return (
    <nav
      className={`rounded-xl border border-border bg-muted/20 p-4 space-y-4 ${className}`}
      aria-label="Смежные разделы каталога"
    >
      {relatedDistricts.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Другие районы
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedDistricts.map((d) => (
              <Link
                key={d.id}
                to={buildCatalogFilterUrl(regionId!, { district: d.name })}
                className="text-xs px-2.5 py-1 rounded-full border bg-background hover:border-primary/40 transition-colors"
              >
                {d.name}
                <span className="text-muted-foreground ml-1 tabular-nums">{d.listingCount}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {relatedSubways.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <TrainFront className="w-3.5 h-3.5" /> Метро рядом
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedSubways.map((s) => (
              <Link
                key={s.id}
                to={buildCatalogFilterUrl(regionId!, { subway: s.name })}
                className="text-xs px-2.5 py-1 rounded-full border bg-background hover:border-primary/40 transition-colors"
              >
                м. {s.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {nearbyBlocks.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> ЖК в районе
          </p>
          <div className="flex flex-wrap gap-1.5">
            {nearbyBlocks.map((b) => (
              <Link
                key={b.id}
                to={`/complex/${b.slug}`}
                className="text-xs px-2.5 py-1 rounded-full border bg-background hover:border-primary/40 transition-colors"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {roomTypes.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" /> По комнатности
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roomTypes.map((r) => (
              <Link
                key={r.rooms}
                to={`/catalog?region_id=${regionId}${landing.district ? `&district_names=${encodeURIComponent(landing.district)}` : ''}${landing.subway ? `&subway_names=${encodeURIComponent(landing.subway)}` : ''}&rooms=${r.rooms}`}
                className="text-xs px-2.5 py-1 rounded-full border bg-background hover:border-primary/40 transition-colors"
              >
                {r.label}
                <span className="text-muted-foreground ml-1 tabular-nums">{r.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

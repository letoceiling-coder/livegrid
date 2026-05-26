import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, TrainFront, Building2, Home } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { buildCatalogFilterUrl } from '@/redesign/lib/catalog-filter-links';
import CollapsibleTagRow from '@/redesign/components/CollapsibleTagRow';
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
  /** Tighter layout for catalog footer (district/subway landings). */
  compact?: boolean;
};

const TAG_LIMIT = 8;

function DiscoveryGroup({
  title,
  icon: Icon,
  compact,
  children,
}: {
  title: string;
  icon: typeof MapPin;
  compact?: boolean;
  children: React.ReactNode[];
}) {
  if (children.length === 0) return null;
  return (
    <div>
      <p
        className={
          compact
            ? 'text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1'
            : 'text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5'
        }
      >
        <Icon className="w-3 h-3 shrink-0" /> {title}
      </p>
      <CollapsibleTagRow items={children} maxVisible={TAG_LIMIT} />
    </div>
  );
}

const tagClass =
  'text-xs px-2 py-0.5 rounded-md border border-border/80 bg-background hover:border-primary/40 transition-colors';

export default function CatalogDiscoveryLinks({ regionId, landing, className = '', compact }: Props) {
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

  const districtTags = relatedDistricts.map((d) => (
    <Link key={d.id} to={buildCatalogFilterUrl(regionId!, { district: d.name })} className={tagClass}>
      {d.name}
      <span className="text-muted-foreground ml-1 tabular-nums">{d.listingCount}</span>
    </Link>
  ));

  const subwayTags = relatedSubways.map((s) => (
    <Link key={s.id} to={buildCatalogFilterUrl(regionId!, { subway: s.name })} className={tagClass}>
      м. {s.name}
    </Link>
  ));

  const blockTags = nearbyBlocks.map((b) => (
    <Link key={b.id} to={`/complex/${b.slug}`} className={tagClass}>
      {b.name}
    </Link>
  ));

  const roomTags = roomTypes.map((r) => (
    <Link
      key={r.rooms}
      to={`/catalog?region_id=${regionId}${landing.district ? `&district_names=${encodeURIComponent(landing.district)}` : ''}${landing.subway ? `&subway_names=${encodeURIComponent(landing.subway)}` : ''}&rooms=${r.rooms}`}
      className={tagClass}
    >
      {r.label}
      <span className="text-muted-foreground ml-1 tabular-nums">{r.count}</span>
    </Link>
  ));

  return (
    <nav
      className={
        compact
          ? `space-y-3 ${className}`
          : `rounded-lg border border-border/60 bg-muted/15 p-3 space-y-3 ${className}`
      }
      aria-label="Смежные разделы каталога"
    >
      <DiscoveryGroup title="Другие районы" icon={MapPin} compact={compact}>
        {districtTags}
      </DiscoveryGroup>
      <DiscoveryGroup title="Метро рядом" icon={TrainFront} compact={compact}>
        {subwayTags}
      </DiscoveryGroup>
      <DiscoveryGroup title="ЖК в районе" icon={Building2} compact={compact}>
        {blockTags}
      </DiscoveryGroup>
      <DiscoveryGroup title="По комнатности" icon={Home} compact={compact}>
        {roomTags}
      </DiscoveryGroup>
    </nav>
  );
}

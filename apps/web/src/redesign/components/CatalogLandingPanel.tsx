import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import CatalogDiscoveryLinks from '@/redesign/components/CatalogDiscoveryLinks';
import type { CatalogLandingContext } from '@/redesign/lib/catalog-landing';

type SeoLandingPayload = {
  kind: string;
  intro: string;
  faq: Array<{ q: string; a: string }>;
};

type Props = {
  regionId: number | null;
  regionName?: string | null;
  landing: CatalogLandingContext;
  className?: string;
};

/** District/subway SEO context only — no FAQ, no expert CTA on catalog. */
export default function CatalogLandingPanel({ regionId, regionName, landing, className = '' }: Props) {
  const showPanel =
    regionId != null && (landing.kind === 'district' || landing.kind === 'subway');

  const seoQuery = useQuery({
    queryKey: ['content', 'seo-landing', regionId, regionName, landing.district, landing.subway],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (regionId != null) sp.set('region_id', String(regionId));
      if (regionName) sp.set('region_name', regionName);
      if (landing.district) sp.set('district', landing.district);
      if (landing.subway) sp.set('subway', landing.subway);
      return apiGet<SeoLandingPayload>(`/content/seo-landing?${sp.toString()}`);
    },
    enabled: showPanel,
    staleTime: 300_000,
  });

  if (!showPanel) return null;

  const intro = seoQuery.data?.intro?.trim();

  return (
    <section className={`space-y-3 mt-6 pt-4 border-t border-border/60 ${className}`} aria-label="Контекст района">
      {intro ? (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl line-clamp-3">{intro}</p>
      ) : null}
      <CatalogDiscoveryLinks regionId={regionId} landing={landing} compact />
    </section>
  );
}

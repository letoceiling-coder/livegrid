import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { apiGet } from '@/lib/api';
import PublicTrustStrip from '@/redesign/components/PublicTrustStrip';
import SelectionInquiryBar from '@/redesign/components/SelectionInquiryBar';
import CatalogDiscoveryLinks from '@/redesign/components/CatalogDiscoveryLinks';

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

export default function CatalogLandingPanel({ regionId, regionName, landing, className = '' }: Props) {
  const [faqOpen, setFaqOpen] = useState(false);

  const showPanel =
    regionId != null &&
    (landing.kind === 'district' || landing.kind === 'subway' || landing.kind === 'region');

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
  const faq = seoQuery.data?.faq ?? [];
  const ctaContext =
    landing.kind === 'district' && landing.district
      ? `Район ${landing.district}${regionName ? ` · ${regionName}` : ''}`
      : landing.kind === 'subway' && landing.subway
        ? `м. ${landing.subway}${regionName ? ` · ${regionName}` : ''}`
        : regionName ?? 'Каталог';

  return (
    <section className={`space-y-4 mb-5 ${className}`} aria-label="SEO-лендинг каталога">
      {intro ? (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{intro}</p>
      ) : null}

      <CatalogDiscoveryLinks regionId={regionId} landing={landing} />

      <div className="rounded-xl border border-border bg-card p-4 hidden sm:block">
        <SelectionInquiryBar
          source={`catalog-landing:${landing.kind}`}
          contextFooter={ctaContext}
        />
      </div>

      {faq.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
            onClick={() => setFaqOpen((v) => !v)}
            aria-expanded={faqOpen}
          >
            Частые вопросы
            {faqOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {faqOpen ? (
            <dl className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {faq.map((item) => (
                <div key={item.q}>
                  <dt className="text-sm font-medium">{item.q}</dt>
                  <dd className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

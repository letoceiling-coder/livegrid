import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Building2, Loader2, ExternalLink } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { themeClasses, type EcosystemThemeKey, type PublicTrustIndicators } from '@lg/shared';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import EcosystemTrustChips from '@/ecosystem/components/EcosystemTrustChips';
import StickyContactCta from '@/ecosystem/components/StickyContactCta';
import { cn } from '@/lib/utils';

type AgencyProfile = {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  about: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  theme: EcosystemThemeKey;
  agents: Array<{ slug: string; name: string | null; avatarUrl: string | null }>;
  listingCount: number;
  trust: PublicTrustIndicators;
};

type ListingRow = {
  id: number;
  title: string | null;
  address: string | null;
  price: string | number | null;
  region?: { name: string };
  promotionTier?: string;
};

export default function PublicAgencyPage() {
  const { slug = '' } = useParams();

  const profileQuery = useQuery({
    queryKey: ['ecosystem', 'agency', slug],
    queryFn: () => apiGet<AgencyProfile>(`/ecosystem/agencies/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  const listingsQuery = useQuery({
    queryKey: ['ecosystem', 'agency', slug, 'listings'],
    queryFn: () =>
      apiGet<{ data: ListingRow[] }>(`/ecosystem/agencies/${encodeURIComponent(slug)}/listings?per_page=12`),
    enabled: Boolean(slug) && profileQuery.isSuccess,
  });

  const p = profileQuery.data;
  const theme = themeClasses(p?.theme ?? 'default');

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 sm:pb-8">
      <RedesignHeader />
      <main className="flex-1 max-w-3xl mx-auto w-full">
        {profileQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : profileQuery.isError || !p ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Агентство не найдено</p>
            <Link to="/catalog" className="text-sm text-primary underline mt-2 inline-block">
              В каталог
            </Link>
          </div>
        ) : (
          <>
            <AgencyHero profile={p} themeBanner={theme.banner} />

            <div className="px-4 py-4 space-y-4">
              <EcosystemTrustChips trust={p.trust} />

              {p.about ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{p.about}</p>
              ) : null}

              {p.website ? (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('inline-flex items-center gap-1 text-sm', theme.accent)}
                >
                  {p.website.replace(/^https?:\/\//, '').slice(0, 40)}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}

              {p.agents.length > 0 ? (
                <section>
                  <h2 className="text-sm font-semibold mb-2">Агенты</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {p.agents.map((a) => (
                      <Link key={a.slug} to={`/agent/${a.slug}`} className="shrink-0 w-24 text-center">
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt="" className="w-14 h-14 rounded-full mx-auto object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-muted mx-auto" />
                        )}
                        <p className="text-[11px] mt-1 truncate">{a.name ?? 'Агент'}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-sm font-semibold mb-2">Объявления</h2>
                {listingsQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (listingsQuery.data?.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет опубликованных объявлений</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                    {listingsQuery.data!.data.map((l) => (
                      <Link
                        key={l.id}
                        to={`/listing/${l.id}`}
                        className="shrink-0 w-[200px] snap-start rounded-xl border p-3 hover:bg-muted/40 transition-colors"
                      >
                        <p className="font-medium text-sm line-clamp-2">{l.title ?? l.address ?? `#${l.id}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">{l.region?.name ?? ''}</p>
                        {l.price != null ? (
                          <p className="text-sm font-semibold mt-2">{Number(l.price).toLocaleString('ru-RU')} ₽</p>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="px-4 hidden sm:block pb-6">
              <StickyContactCta phone={p.phone} email={p.email} website={p.website} />
            </div>
            <StickyContactCta phone={p.phone} email={p.email} website={p.website} className="sm:hidden" />
          </>
        )}
      </main>
      <FooterSection />
    </div>
  );
}

function AgencyHero({ profile: p, themeBanner }: { profile: AgencyProfile; themeBanner: string }) {
  const inner = (
    <div className="max-w-3xl mx-auto px-4 py-8 flex items-end gap-4 relative z-10">
      {p.logoUrl ? (
        <img src={p.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-white/30 bg-white" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-white" />
        </div>
      )}
      <div className="min-w-0 text-white pb-1">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{p.displayName}</h1>
        <p className="text-sm text-white/80">{p.listingCount} объявлений</p>
      </div>
    </div>
  );

  if (p.bannerUrl) {
    return (
      <div className="relative bg-cover bg-center min-h-[140px]" style={{ backgroundImage: `url(${p.bannerUrl})` }}>
        <div className="absolute inset-0 bg-black/45" />
        {inner}
      </div>
    );
  }

  return <div className={cn('min-h-[120px]', themeBanner)}>{inner}</div>;
}

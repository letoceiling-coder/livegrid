import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Loader2, User } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { themeClasses, type EcosystemThemeKey, type PublicTrustIndicators } from '@lg/shared';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import EcosystemTrustChips from '@/ecosystem/components/EcosystemTrustChips';
import StickyContactCta from '@/ecosystem/components/StickyContactCta';
import TrustBadgeRow, { type TrustBadgeView } from '@/redesign/components/TrustBadgeRow';
import { cn } from '@/lib/utils';

type AgentProfile = {
  slug: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  specializations: string[];
  phone: string | null;
  email: string | null;
  agency: { slug: string; displayName: string; logoUrl: string | null } | null;
  theme: EcosystemThemeKey;
  listingCount: number;
  avgListingQuality: number | null;
  trust: PublicTrustIndicators;
  badges: TrustBadgeView[];
};

type ListingRow = {
  id: number;
  title: string | null;
  address: string | null;
  price: string | number | null;
  region?: { name: string };
};

export default function PublicAgentPage() {
  const { slug = '' } = useParams();

  const profileQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug],
    queryFn: () => apiGet<AgentProfile>(`/ecosystem/agents/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  const listingsQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug, 'listings'],
    queryFn: () =>
      apiGet<{ data: ListingRow[] }>(`/ecosystem/agents/${encodeURIComponent(slug)}/listings?per_page=12`),
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
            <p className="text-muted-foreground">Агент не найден</p>
            <Link to="/catalog" className="text-sm text-primary underline mt-2 inline-block">
              В каталог
            </Link>
          </div>
        ) : (
          <>
            <div className={cn('px-4 pt-6 pb-4', theme.banner.replace('bg-gradient-to-r', 'bg-gradient-to-b'))}>
              <div className="flex items-start gap-4">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-background shadow" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-1">
                  <h1 className="text-xl font-bold truncate">{p.name ?? 'Агент'}</h1>
                  {p.agency ? (
                    <Link to={`/agency/${p.agency.slug}`} className="text-sm text-primary hover:underline">
                      {p.agency.displayName}
                    </Link>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1">{p.listingCount} объявлений</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              <TrustBadgeRow badges={p.badges} />
              <EcosystemTrustChips trust={p.trust} />

              {p.bio ? <p className="text-sm text-muted-foreground leading-relaxed">{p.bio}</p> : null}

              {p.specializations.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {p.specializations.map((s) => (
                    <span key={s} className={cn('text-xs rounded-full border px-2.5 py-1', theme.chip)}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <section>
                <h2 className="text-sm font-semibold mb-2">Объявления</h2>
                {listingsQuery.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (listingsQuery.data?.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет опубликованных объявлений</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                    {listingsQuery.data!.data.map((l) => (
                      <Link
                        key={l.id}
                        to={`/listing/${l.id}`}
                        className="shrink-0 w-[200px] snap-start rounded-xl border p-3 hover:bg-muted/40"
                      >
                        <p className="font-medium text-sm line-clamp-2">{l.title ?? l.address ?? `#${l.id}`}</p>
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
              <StickyContactCta phone={p.phone} email={p.email} />
            </div>
            <StickyContactCta phone={p.phone} email={p.email} className="sm:hidden" />
          </>
        )}
      </main>
      <FooterSection />
    </div>
  );
}

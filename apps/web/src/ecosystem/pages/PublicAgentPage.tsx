import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Phone } from 'lucide-react';
import { apiGet } from '@/lib/api';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import AgentAvatar from '@/ecosystem/components/AgentAvatar';
import AgentListingsPagination from '@/ecosystem/components/AgentListingsPagination';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AgentProfile = {
  slug: string;
  name: string | null;
  avatarUrl: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  listingCount: number;
  listingCountsByKind: { all: number; apartment: number; house: number };
};

type ListingRow = ApiListingCardRow & { title?: string | null; address?: string | null };

type Paginated = {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

const PER_PAGE = 12;

type KindTab = 'all' | 'APARTMENT' | 'HOUSE';

function kindLabel(tab: KindTab): string {
  if (tab === 'APARTMENT') return 'Квартиры';
  if (tab === 'HOUSE') return 'Дома';
  return 'Все';
}

export default function PublicAgentPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const kindParam = searchParams.get('kind');
  const kind: KindTab =
    kindParam === 'APARTMENT' || kindParam === 'HOUSE' ? kindParam : 'all';

  const profileQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug],
    queryFn: () => apiGet<AgentProfile>(`/ecosystem/agents/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  const listingsQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug, 'listings', page, kind],
    queryFn: () => {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (kind !== 'all') sp.set('kind', kind);
      return apiGet<Paginated>(`/ecosystem/agents/${encodeURIComponent(slug)}/listings?${sp}`);
    },
    enabled: Boolean(slug) && profileQuery.isSuccess,
  });

  const p = profileQuery.data;
  const meta = listingsQuery.data?.meta;
  const counts = p?.listingCountsByKind ?? { all: 0, apartment: 0, house: 0 };

  const setKind = (next: KindTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('kind');
    else nextParams.set('kind', next);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const setPage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const tabs: { key: KindTab; count: number }[] = [
    { key: 'all', count: counts.all },
    { key: 'APARTMENT', count: counts.apartment },
    { key: 'HOUSE', count: counts.house },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RedesignHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        {profileQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : profileQuery.isError || !p ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Агент не найден</p>
            <Link to="/agents" className="text-sm text-primary underline mt-2 inline-block">
              Наши специалисты
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start mb-8 pb-8 border-b border-border">
              <AgentAvatar name={p.name} avatarUrl={p.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold">{p.name ?? 'Агент'}</h1>
                {p.title ? <p className="text-muted-foreground mt-1">{p.title}</p> : null}
                <div className="mt-4 space-y-2 text-sm">
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      {p.phone}
                    </a>
                  ) : null}
                  {p.email ? (
                    <a
                      href={`mailto:${p.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      {p.email}
                    </a>
                  ) : null}
                </div>
                {p.phone ? (
                  <Button asChild className="mt-4" size="sm">
                    <a href={`tel:${p.phone.replace(/\s/g, '')}`}>Позвонить</a>
                  </Button>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button asChild variant="outline" size="sm" className="border-border text-foreground">
                    <Link to={`/agent/${p.slug}/listings`}>Все объявления</Link>
                  </Button>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold mb-4">Объявления агента</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setKind(tab.key)}
                    className={cn(
                      'text-sm rounded-full border px-3 py-1.5 transition-colors',
                      kind === tab.key
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {kindLabel(tab.key)}({tab.count})
                  </button>
                ))}
              </div>

              {listingsQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (listingsQuery.data?.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Нет объявлений в этой категории</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listingsQuery.data!.data.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              )}

              {meta ? (
                <AgentListingsPagination
                  page={page}
                  totalPages={meta.total_pages}
                  onPageChange={setPage}
                />
              ) : null}
            </section>
          </>
        )}
      </main>
      <FooterSection />
    </div>
  );
}

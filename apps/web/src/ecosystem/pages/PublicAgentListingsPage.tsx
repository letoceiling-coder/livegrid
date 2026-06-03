import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import AgentListingsPagination from '@/ecosystem/components/AgentListingsPagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AgentProfile = {
  slug: string;
  name: string | null;
};

type ListingRow = ApiListingCardRow & { title?: string | null; address?: string | null };

type Paginated = {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

const PER_PAGE = 12;

export default function PublicAgentListingsPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const urlSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);

  const profileQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug],
    queryFn: () => apiGet<AgentProfile>(`/ecosystem/agents/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  const listingsQuery = useQuery({
    queryKey: ['ecosystem', 'agent', slug, 'listings', page, urlSearch],
    queryFn: () => {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (urlSearch.trim()) sp.set('search', urlSearch.trim());
      return apiGet<Paginated>(
        `/ecosystem/agents/${encodeURIComponent(slug)}/listings?${sp}`,
      );
    },
    enabled: Boolean(slug) && profileQuery.isSuccess,
  });

  const p = profileQuery.data;
  const meta = listingsQuery.data?.meta;
  const rows = listingsQuery.data?.data ?? [];

  const applySearch = () => {
    const next = new URLSearchParams(searchParams);
    const q = searchInput.trim();
    if (q) next.set('search', q);
    else next.delete('search');
    next.set('page', '1');
    setSearchParams(next);
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RedesignHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {profileQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : profileQuery.isError || !p ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Агент не найден</p>
            <Link to="/agents" className="text-sm text-primary underline mt-2 inline-block">
              Наши специалисты
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Link to={`/agent/${p.slug}`} className="text-sm text-primary hover:underline">
                ← {p.name ?? 'Агент'}
              </Link>
              <h1 className="text-2xl font-bold mt-2">{p.name ?? 'Агент'} — все объявления</h1>
              {meta ? (
                <p className="text-sm text-muted-foreground mt-1">{meta.total} объектов</p>
              ) : null}
            </div>

            <div className="flex gap-2 mb-6 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по ID или адресу"
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
              </div>
              <Button type="button" variant="secondary" onClick={applySearch}>
                Найти
              </Button>
            </div>

            {listingsQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Нет объявлений</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((l) => (
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
          </>
        )}
      </main>
      <FooterSection />
    </div>
  );
}

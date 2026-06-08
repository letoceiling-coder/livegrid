import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ComplexCard from '@/redesign/components/ComplexCard';
import HorizontalSnapSlider from '@/redesign/components/HorizontalSnapSlider';
import { mapApiBlockListRowToResidentialComplex } from '@/redesign/lib/blocks-from-api';
import { ArrowRight, Flame, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { useSiteSettings, setting } from '@/redesign/hooks/useSiteSettings';
import { btnClass } from '@/redesign/lib/button-styles';
import type { ApiBlockListRow } from '@/redesign/lib/blocks-from-api';

interface Props {
  title: string;
  type: 'hot' | 'start';
}

function intSetting(map: Map<string, string> | undefined, key: string, fallback: number): number {
  const raw = map?.get(key);
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function startDateRange(windowDays: number): { from: string; to: string } {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + windowDays);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function CardSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
          <div className="aspect-video bg-muted" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const PropertyGridSection = ({ title, type }: Props) => {
  const { data: regionId } = useDefaultRegionId();
  const { data: siteMap } = useSiteSettings();
  const isHot = type === 'hot';
  const isStart = type === 'start';

  const hotPer = intSetting(siteMap, 'home_hot_per_page', 8);
  const startPer = intSetting(siteMap, 'home_start_per_page', 3);
  const windowDays = intSetting(siteMap, 'home_start_window_days', 180);
  const hotMode = (setting(siteMap, 'home_hot_mode', 'latest') || 'latest').toLowerCase().trim();
  const hotSlugs = (setting(siteMap, 'home_hot_fixed_slugs', '') || '').trim();

  const displayTitle = isHot
    ? setting(siteMap, 'home_hot_title', title)
    : setting(siteMap, 'home_start_title', title);

  const hotQuery = useQuery({
    queryKey: ['blocks', 'home', 'hot', regionId, hotPer, hotMode, hotSlugs],
    enabled: isHot && regionId != null,
    staleTime: 300_000,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      sp.set('per_page', String(hotPer));
      sp.set('page', '1');
      sp.set('require_active_listings', 'true');
      sp.set('sort', 'created_desc');
      const useSlugs = hotMode === 'fixed_slugs' && hotSlugs.length > 0;
      if (useSlugs) {
        sp.set('block_slugs', hotSlugs);
      } else if (hotMode === 'promoted') {
        sp.set('is_promoted', 'true');
      }
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
  });

  const startQuery = useQuery({
    queryKey: ['blocks', 'home', 'start', regionId, startPer, windowDays],
    enabled: isStart && regionId != null,
    staleTime: 300_000,
    queryFn: async () => {
      const { from, to } = startDateRange(windowDays);
      const base = new URLSearchParams();
      base.set('region_id', String(regionId));
      base.set('per_page', String(startPer));
      base.set('page', '1');
      base.set('require_active_listings', 'true');

      const withSales = new URLSearchParams(base);
      withSales.set('sort', 'sales_start_asc');
      withSales.set('sales_start_from', from);
      withSales.set('sales_start_to', to);
      const primary = await apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${withSales}`);
      if ((primary.data?.length ?? 0) > 0) return primary;

      const fallback = new URLSearchParams(base);
      fallback.set('sort', 'created_desc');
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${fallback}`);
    },
  });

  const hotComplexes = useMemo(() => {
    const rows = hotQuery.data?.data ?? [];
    return rows.map((b) => mapApiBlockListRowToResidentialComplex(b));
  }, [hotQuery.data]);

  const startComplexes = useMemo(() => {
    const rows = startQuery.data?.data ?? [];
    return rows.map((b) => mapApiBlockListRowToResidentialComplex(b)).slice(0, 3);
  }, [startQuery.data]);

  const loading = isHot ? hotQuery.isLoading : startQuery.isLoading;
  const empty = !loading && (isHot ? hotComplexes.length === 0 : startComplexes.length === 0);

  if (isStart && empty) return null;

  const complexCard = (c: ReturnType<typeof mapApiBlockListRowToResidentialComplex>) => (
    <div key={c.id} className="flex h-full min-h-0 w-full">
      <ComplexCard complex={c} variant="compact" coverAspect="16/9" />
    </div>
  );

  return (
    <section className={cn('py-8 sm:py-12', isHot && 'bg-accent/30')}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isHot && <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />}
            <h2 className="text-base sm:text-xl font-bold truncate">{displayTitle}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {isStart ? (
              <Link to="/contacts" className={btnClass('primary', { compact: true })}>
                Помощь с подбором
              </Link>
            ) : (
              <Link to="/catalog" className={btnClass('secondary', { compact: true })}>
                Все предложения
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Загрузка…
            </div>
            <CardSkeleton count={isStart ? 3 : 4} />
          </div>
        )}

        {empty && (
          <p className="text-sm text-muted-foreground text-center py-12 max-w-lg mx-auto">
            {isHot
              ? 'Нет жилых комплексов для этого блока. Включите «Реклама» у ЖК или задайте slug в настройках главной.'
              : 'Нет ЖК со стартом продаж в выбранном периоде.'}
          </p>
        )}

        {!loading && !empty && isHot && (
          <HorizontalSnapSlider
            mobileItemClass="w-[calc(100vw-32px)]"
            desktopGridClass="sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 items-stretch"
            showArrows
            showDots
          >
            {hotComplexes.map((c) => complexCard(c))}
          </HorizontalSnapSlider>
        )}

        {!loading && !empty && isStart && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
            {startComplexes.map((c) => complexCard(c))}
          </div>
        )}

        {isStart ? (
          <Link
            to="/catalog?type=apartments&market=new"
            className={cn(btnClass('primary', { block: true }), 'mt-4')}
          >
            Все старты продаж
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            to="/catalog"
            className={cn(btnClass('secondary', { block: true }), 'mt-4 sm:hidden')}
          >
            Все предложения
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {isStart ? (
          <Link
            to="/contacts"
            className={cn(btnClass('primary', { block: true }), 'mt-3 sm:hidden')}
          >
            Помощь с подбором
          </Link>
        ) : null}
      </div>
    </section>
  );
};

export default PropertyGridSection;

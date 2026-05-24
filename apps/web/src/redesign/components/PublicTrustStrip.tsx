import { useQuery } from '@tanstack/react-query';

import { Building2, Home, ShieldCheck, RefreshCw } from 'lucide-react';

import { apiGet } from '@/lib/api';

import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';

import { useSiteSettings, setting } from '@/redesign/hooks/useSiteSettings';



type Props = {
  regionId?: number | null;
  className?: string;
  /** Single-row compact strip for catalog headers */
  compact?: boolean;
};



export default function PublicTrustStrip({ regionId: regionIdProp, className, compact }: Props) {

  const { data: defaultRegionId } = useDefaultRegionId();

  const regionId = regionIdProp ?? defaultRegionId;

  const { data: siteSettings } = useSiteSettings();



  const counts = useQuery({

    queryKey: ['stats', 'listing-kind-counts', regionId],

    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId}`),

    enabled: regionId != null,

    staleTime: 120_000,

  });



  const catalog = useQuery({

    queryKey: ['blocks', 'catalog-counts', regionId],

    queryFn: () => apiGet<{ blocks: number; apartments: number }>(`/blocks/catalog-counts?region_id=${regionId}`),

    enabled: regionId != null,

    staleTime: 120_000,

  });



  const apartments = counts.data?.APARTMENT ?? catalog.data?.apartments;

  const blocks = catalog.data?.blocks;



  const syncTitle = setting(siteSettings, 'trust_sync_title', 'Еженедельно');

  const syncSubtitle = setting(siteSettings, 'trust_sync_subtitle', 'синхронизация фида');

  const verifiedTitle = setting(siteSettings, 'trust_verified_title', 'Проверенные данные');

  const verifiedSubtitle = setting(siteSettings, 'trust_verified_subtitle', 'из официального фида');



  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className ?? ''}`}
        aria-label="Показатели платформы"
      >
        {apartments != null ? (
          <span className="inline-flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground tabular-nums">{apartments.toLocaleString('ru-RU')}</span> квартир
          </span>
        ) : null}
        {blocks != null ? (
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground tabular-nums">{blocks.toLocaleString('ru-RU')}</span> ЖК
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          {syncTitle} · {syncSubtitle}
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          {verifiedTitle}
        </span>
      </div>
    );
  }



  return (

    <section

      className={`max-w-[1400px] mx-auto px-4 py-4 sm:py-6 ${className ?? ''}`}

      aria-label="Показатели платформы"

    >

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">

        <div className="rounded-xl border bg-card p-3 sm:p-4">

          <Home className="w-4 h-4 text-primary mb-2" />

          <p className="text-lg sm:text-xl font-bold tabular-nums">

            {apartments != null ? apartments.toLocaleString('ru-RU') : '—'}

          </p>

          <p className="text-[10px] sm:text-xs text-muted-foreground">квартир в каталоге</p>

        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">

          <Building2 className="w-4 h-4 text-primary mb-2" />

          <p className="text-lg sm:text-xl font-bold tabular-nums">

            {blocks != null ? blocks.toLocaleString('ru-RU') : '—'}

          </p>

          <p className="text-[10px] sm:text-xs text-muted-foreground">жилых комплексов</p>

        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">

          <RefreshCw className="w-4 h-4 text-primary mb-2" />

          <p className="text-sm sm:text-base font-semibold">{syncTitle}</p>

          <p className="text-[10px] sm:text-xs text-muted-foreground">{syncSubtitle}</p>

        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4">

          <ShieldCheck className="w-4 h-4 text-primary mb-2" />

          <p className="text-sm sm:text-base font-semibold">{verifiedTitle}</p>

          <p className="text-[10px] sm:text-xs text-muted-foreground">{verifiedSubtitle}</p>

        </div>

      </div>

    </section>

  );

}



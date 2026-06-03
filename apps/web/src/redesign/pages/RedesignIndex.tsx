import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { ApiConnectionStrip } from '@/components/ApiConnectionStrip';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import HeroSearch from '@/redesign/components/HeroSearch';
import ComplexCard from '@/redesign/components/ComplexCard';
import QuizSection from '@/components/QuizSection';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import HelpSelectionCta from '@/components/HelpSelectionCta';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import type { ConsultationContext } from '@/redesign/lib/conversion-cta';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';

const RedesignIndex = () => {
  const navigate = useNavigate();
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultContext, setConsultContext] = useState<ConsultationContext | null>(null);
  const { data: regionId } = useDefaultRegionId();

  const blocksFeatured = useQuery({
    queryKey: ['blocks', 'featured', regionId],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      sp.set('per_page', '24');
      sp.set('page', '1');
      sp.set('sort', 'created_desc');
      sp.set('require_active_listings', 'true');
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
    enabled: regionId != null,
  });

  const featured = useMemo(() => {
    const rows = blocksFeatured.data?.data ?? [];
    const pool = rows.filter(
      (b) => (b._count?.listings ?? 0) > 0 && (b.images?.length ?? 0) > 0,
    );
    const promoted = pool.filter((b) => b.isPromoted);
    const pick = (promoted.length >= 6 ? promoted : pool.length ? pool : rows)
      .slice()
      .sort((a, z) => (z._count?.listings ?? 0) - (a._count?.listings ?? 0))
      .slice(0, 8)
      .map(mapApiBlockListRowToResidentialComplex);
    return pick;
  }, [blocksFeatured.data]);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <ApiConnectionStrip />
      <HeroSearch />

      {featured.length > 0 && (
      <section className="relative z-0 max-w-[1400px] mx-auto px-4 pt-6 pb-6 sm:pb-10">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold">Популярные ЖК</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/map')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              На карте
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
            >
              Все предложения
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-start">
          {featured.map((c) => (
            <ComplexCard key={c.id} complex={c} variant="compact" coverAspect="16/9" />
          ))}
        </div>

        {/* Mobile swiper */}
        <div className="flex sm:hidden gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
          {featured.map(c => (
            <div key={c.id} className="min-w-[260px] snap-start shrink-0">
              <ComplexCard complex={c} variant="compact" coverAspect="16/9" />
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/catalog')}
          className="flex sm:hidden items-center justify-center gap-1.5 mt-3 w-full py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
        >
          Все предложения
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
      )}


      <PropertyGridSection title="Горячие предложения" type="hot" />
      <PropertyGridSection title="Старт продаж" type="start" />

      <div id="quiz-section">
        <QuizSection />
      </div>

      <AboutPlatform pageSlug="/" />

      {/* Map CTA — compact on mobile */}
      <section className="max-w-[1400px] mx-auto px-4 pb-6 sm:pb-8">
        <Link to="/map" className="block rounded-xl sm:rounded-2xl bg-muted border border-border p-5 sm:p-10 hover:border-primary/30 transition-colors group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-lg group-hover:text-primary transition-colors">Поиск на карте</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Найдите ЖК рядом с метро</p>
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ml-auto" />
          </div>
        </Link>
      </section>

      <HelpSelectionCta
        pageSlug="/"
        onConsult={() => {
          setConsultContext({
            surface: 'home',
            source: 'home:help-cta',
            contextFooter: 'Запрос с главной страницы',
          });
          setConsultOpen(true);
        }}
      />

      <ConsultationFlow open={consultOpen} onOpenChange={setConsultOpen} context={consultContext} />

      <AdditionalFeatures
        pageSlug="/"
        onConsult={() => {
          setConsultContext({
            surface: 'home',
            source: 'home:tools-consult',
            contextFooter: 'Запрос с блока инструментов',
          });
          setConsultOpen(true);
        }}
      />
      <LatestNews />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default RedesignIndex;
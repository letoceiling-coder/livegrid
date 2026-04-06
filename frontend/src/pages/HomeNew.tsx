import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { useHomeBlocks } from '@/api/hooks/useHomeBlocks';
import { homeComplexCardToResidential } from '@/api/adapters/homeToResidentialComplex';
import {
  mapApartmentToComplexCard,
  apartmentCardToResidential,
} from '@/api/adapters/apartmentToComplex';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import HeroSearch from '@/redesign/components/HeroSearch';
import FooterSection from '@/components/FooterSection';

export default function HomeNew() {
  const { data, loading, error } = useHomeBlocks();

  if (loading) {
    return <div className="p-10 text-center">Загрузка...</div>;
  }

  if (error) {
    return <div className="p-10 text-center">Ошибка загрузки данных</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <section className="relative bg-background overflow-visible">
        <div className="max-w-[1400px] mx-auto px-0 pt-4 sm:pt-6 pb-2 sm:pb-4">
          <HeroSearch />
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-4">Популярные ЖК</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.popular?.length ? (
            data.popular.map((item: any) => (
              <ComplexCard key={`popular-${item.id}`} complex={homeComplexCardToResidential(item)} />
            ))
          ) : (
            <div className="text-center text-gray-500 col-span-full">Нет объектов</div>
          )}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-4">Горячие предложения</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.hot?.length ? (
            data.hot.map((item: any) => {
              const mapped = mapApartmentToComplexCard(item);
              return (
                <ComplexCard
                  key={`hot-${item.id}`}
                  complex={apartmentCardToResidential(mapped)}
                  apartmentId={String(item.id)}
                />
              );
            })
          ) : (
            <div className="text-center text-gray-500 col-span-full">Нет объектов</div>
          )}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-4">Старт продаж</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.start?.length ? (
            data.start.map((item: any) => (
              <ComplexCard key={`start-${item.id}`} complex={homeComplexCardToResidential(item)} />
            ))
          ) : (
            <div className="text-center text-gray-500 col-span-full">Нет объектов</div>
          )}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 pb-12">
        <Link
          to="/map"
          className="block rounded-2xl bg-muted border border-border p-8 sm:p-10 hover:border-primary/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">Поиск на карте</h3>
              <p className="text-sm text-muted-foreground">Найдите ЖК рядом с нужным метро или районом</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto hidden sm:block" />
          </div>
        </Link>
      </section>

      <FooterSection />
    </div>
  );
}

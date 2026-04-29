import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { useHomeBlocks } from '@/api/hooks/useHomeBlocks';
import { homeComplexCardToResidential } from '@/api/adapters/homeToResidentialComplex';
import {
  mapApartmentToComplexCard,
  apartmentCardToResidential,
} from '@/api/adapters/apartmentToComplex';
import ComplexCard from '@/redesign/components/ComplexCard';
import HeroSearch from '@/redesign/components/HeroSearch';

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="max-w-[1400px] mx-auto px-4 py-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[280px] rounded-xl bg-muted/70 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

export default function HomeNew() {
  const { data, loading, error } = useHomeBlocks();

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background pb-16 lg:pb-0">
      <section className="relative bg-background overflow-visible min-w-0">
        <div className="max-w-[1400px] mx-auto min-w-0 px-0 pt-4 sm:pt-6 pb-2 sm:pb-4">
          <HeroSearch />
        </div>
      </section>

      {loading && (
        <>
          <SectionSkeleton title="Популярные ЖК" />
          <SectionSkeleton title="Горячие предложения" />
          <SectionSkeleton title="Старт продаж" />
        </>
      )}

      {!loading && error && (
        <div className="max-w-[1400px] mx-auto px-4 py-10 text-center text-sm text-destructive">
          Не удалось загрузить блоки главной. Обновите страницу.
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="max-w-[1400px] mx-auto px-4 py-12 animate-in fade-in duration-300">
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

          <section className="max-w-[1400px] mx-auto px-4 py-12 animate-in fade-in duration-300">
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

          <section className="max-w-[1400px] mx-auto px-4 py-12 animate-in fade-in duration-300">
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
        </>
      )}

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
    </div>
  );
}

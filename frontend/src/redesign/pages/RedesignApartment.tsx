import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Calculator, MapPin, Building2, CalendarDays, Ruler, ChefHat, Layers, Paintbrush, Train, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import { useApartment } from '@/hooks/useApartment';

function formatPrice(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)} млн ₽`;
  return `${p.toLocaleString('ru-RU')} ₽`;
}

const RedesignApartment = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useApartment(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">
            {(error as any)?.message === 'not_found' ? 'Квартира не найдена' : 'Ошибка загрузки данных'}
          </p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Каталог</Link>
        </div>
      </div>
    );
  }

  const { apartment: apt, complex, building } = data;

  const details = [
    { icon: Layers,       label: 'Комнат',         value: apt.rooms === 0 ? 'Студия' : `${apt.rooms}` },
    { icon: Ruler,        label: 'Общая площадь',  value: `${apt.area} м²` },
    { icon: ChefHat,      label: 'Кухня',          value: apt.kitchenArea ? `${apt.kitchenArea} м²` : '—' },
    { icon: Building2,    label: 'Этаж',           value: `${apt.floor}${apt.totalFloors ? ` из ${apt.totalFloors}` : ''}` },
    { icon: Paintbrush,   label: 'Отделка',        value: apt.finishing ?? '—' },
    { icon: CalendarDays, label: 'Сдача',          value: building?.deadline ?? '—' },
    { icon: MapPin,       label: 'Район',          value: complex?.district ?? '—' },
    { icon: Train,        label: 'Метро',          value: complex?.subway ? `${complex.subway}${complex.subwayDistance ? ` · ${complex.subwayDistance}` : ''}` : '—' },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5 flex-wrap">
          <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
          {complex && (
            <>
              <span>/</span>
              <Link to={`/complex/${complex.slug}`} className="hover:text-foreground transition-colors">{complex.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium">{apt.rooms === 0 ? 'Студия' : `${apt.rooms}-комнатная`}, {apt.area} м²</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Plan */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center p-12">
                {apt.planImage ? (
                  <img src={apt.planImage} alt="Планировка" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-sm text-muted-foreground">Планировка не загружена</div>
                )}
              </div>
            </div>

            {/* Description card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-3">О квартире</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {apt.rooms === 0 ? 'Студия' : `${apt.rooms}-комнатная квартира`} площадью {apt.area} м²
                на {apt.floor} этаже{apt.totalFloors ? ` ${apt.totalFloors}-этажного дома` : ''}{complex ? ` в ЖК «${complex.name}»` : ''}.
                {apt.finishing && apt.finishing !== 'без отделки' ? ` Отделка: ${apt.finishing}.` : ' Без отделки.'}
                {complex?.district ? ` Район: ${complex.district}.` : ''}
                {complex?.subway ? ` Метро ${complex.subway}${complex.subwayDistance ? ` (${complex.subwayDistance})` : ''}.` : ''}
              </p>
            </div>
          </div>

          {/* Info sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              {complex && building && (
                <p className="text-xs text-muted-foreground mb-1">{complex.name} · {building.name}</p>
              )}
              <h1 className="text-2xl font-bold mb-1">
                {apt.rooms === 0 ? 'Студия' : `${apt.rooms}-комнатная`}, {apt.area} м²
              </h1>
              {complex && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
                  <MapPin className="w-3.5 h-3.5" />
                  {complex.address ?? ''}
                  {complex.subway ? ` · м. ${complex.subway}` : ''}
                </div>
              )}

              <div className="border-t border-border pt-5 mb-5">
                <p className="text-3xl font-bold">{formatPrice(apt.price)}</p>
                <p className="text-sm text-muted-foreground mt-1">{apt.pricePerMeter.toLocaleString('ru-RU')} ₽/м²</p>
              </div>

              <div className="space-y-3">
                {details.map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2.5">
                      <d.icon className="w-4 h-4" />{d.label}
                    </span>
                    <span className="font-medium capitalize">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Button className="w-full h-12"><Phone className="w-4 h-4 mr-2" /> Позвонить</Button>
              <Button variant="outline" className="w-full h-12"><MessageCircle className="w-4 h-4 mr-2" /> Записаться на просмотр</Button>
              <Button variant="secondary" className="w-full h-12"><Calculator className="w-4 h-4 mr-2" /> Рассчитать ипотеку</Button>
            </div>

            {/* Builder */}
            {complex?.builder && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {complex.builder.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{complex.builder}</p>
                    <p className="text-xs text-muted-foreground">Застройщик</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedesignApartment;

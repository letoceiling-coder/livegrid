import { useNavigate } from 'react-router-dom';
import type { LayoutGroup } from '@/redesign/data/types';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  layouts: LayoutGroup[];
  complexSlug: string;
}

const LayoutCard = ({ layout }: { layout: LayoutGroup }) => {
  const navigate = useNavigate();
  const canOpen = Boolean(layout.apartmentId);
  const open = () => {
    if (canOpen) navigate(`/apartment/${layout.apartmentId}`);
  };

  return (
    <div
      role="button"
      tabIndex={canOpen ? 0 : -1}
      onClick={open}
      onKeyDown={e => e.key === 'Enter' && open()}
      className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
    >
      <div className="aspect-square bg-muted/50 flex items-center justify-center p-6">
        {layout.planImage ? (
          <img
            src={layout.planImage}
            alt={`${layout.rooms}-комн`}
            className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="8" y="8" width="48" height="48" rx="3" />
              <path d="M8 24h48M24 8v48" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <h4 className="font-semibold text-sm">{layout.rooms === 0 ? 'Студия' : `${layout.rooms}-комнатная`}</h4>
        <p className="text-xs text-muted-foreground">{layout.area} м²</p>
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm font-bold">
            {layout.priceFrom > 0 ? `от ${formatPrice(layout.priceFrom)}` : 'Цена не указана'}
          </p>
          <span className="text-xs text-primary font-medium">{layout.availableCount} кв.</span>
        </div>
      </div>
    </div>
  );
};

const LayoutGrid = ({ layouts }: Props) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {layouts.map(l => (
      <LayoutCard key={l.id} layout={l} />
    ))}
  </div>
);

export default LayoutGrid;

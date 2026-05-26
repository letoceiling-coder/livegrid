import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Apartment, Building, SortDir, SortField } from '@/redesign/data/types';
import ApartmentTypeGroups from '@/redesign/components/ApartmentTypeGroups';
import { prefersReducedMotion } from '@/redesign/lib/map-sidebar-scroll-utils';

type Props = {
  buildings: Building[];
  sort: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
  filterApartments: (apartments: Apartment[]) => Apartment[];
};

export default function ComplexQueueTable({ buildings, sort, onSort, filterApartments }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const animate = !prefersReducedMotion();

  const rows = useMemo(() => {
    return buildings.map((b) => {
      const apts = filterApartments(b.apartments.filter((a) => a.status !== 'sold'));
      const queueLabel = apts[0]?.buildingQueue?.trim() || b.name || `Корпус ${b.id}`;
      return {
        building: b,
        queueLabel,
        apartments: apts,
        count: apts.length,
        deadline: b.deadline || '—',
      };
    }).filter((r) => r.count > 0 || buildings.length === 1);
  }, [buildings, filterApartments]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Свободных квартир нет
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const isOpen = openIds.has(row.building.id);
        return (
          <div key={row.building.id} className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <button
              type="button"
              onClick={() => toggle(row.building.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/25"
              aria-expanded={isOpen}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm">{row.queueLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.building.name && row.building.name !== row.queueLabel ? `${row.building.name} · ` : ''}
                  Сдача {row.deadline}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">{row.count} кв.</span>
                <ChevronDown
                  className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180', !animate && 'transition-none')}
                />
              </div>
            </button>
            <div
              className={cn(
                'grid border-t border-border/60',
                animate && 'transition-[grid-template-rows] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden min-h-0">
                <div className="p-3 pt-2">
                  <ApartmentTypeGroups apartments={row.apartments} sort={sort} onSort={onSort} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

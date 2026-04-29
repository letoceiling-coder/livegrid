import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Apartment } from '@/redesign/data/types';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  apartments: Apartment[];
  floors: number;
  sections: number;
  buildingName: string;
}

const statusBg: Record<string, string> = {
  available: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white',
  reserved: 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-white',
  sold: 'bg-zinc-300 border-zinc-200 text-zinc-700',
};

const Chessboard = ({ apartments, floors, sections, buildingName }: Props) => {
  const effectiveFloors = floors > 0
    ? floors
    : (apartments.length > 0 ? Math.max(...apartments.map(a => a.floor ?? 1)) : 1);

  const grouped = React.useMemo(() => {
    const byFloor = new Map<number, Apartment[]>();
    apartments.forEach((a) => {
      const f = a.floor ?? 1;
      const arr = byFloor.get(f) ?? [];
      arr.push(a);
      byFloor.set(f, arr);
    });

    byFloor.forEach((arr) => {
      arr.sort((x, y) => {
        const sx = x.section ?? 1;
        const sy = y.section ?? 1;
        if (sx !== sy) return sx - sy;
        return x.area - y.area;
      });
    });

    return byFloor;
  }, [apartments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{buildingName}{sections > 0 ? ` · секций ${sections}` : ''}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-700" /> Свободна</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-700 border border-zinc-600" /> Бронь</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-300 border border-zinc-200" /> Продана</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
        <div className="min-w-[760px] space-y-1.5">
          {Array.from({ length: effectiveFloors }, (_, fi) => {
            const floor = effectiveFloors - fi;
            const row = grouped.get(floor) ?? [];
            return (
              <div key={`row-${floor}`} className="grid grid-cols-[44px_1fr] gap-1.5">
                <div className="flex items-center justify-center text-xs text-muted-foreground font-medium rounded-lg bg-muted/30 border border-border/40">
                  {floor}
                </div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(108px, 1fr))` }}>
                  {row.length === 0 && (
                    <div className="h-16 rounded-lg border border-border/40 bg-muted/20" />
                  )}
                  {row.map((apt) => {
                    const roomLabel = apt.roomCategory === 0 || apt.rooms === 0 ? 'Ст' : `${apt.roomCategory ?? apt.rooms}-к`;
                    const sec = apt.section ?? 1;
                    const statusLabel = apt.status === 'available' ? 'Свободна' : apt.status === 'reserved' ? 'Бронь' : 'Продано';
                    const canOpen = apt.status !== 'sold';
                    const cardBody = (
                      <div
                        className={cn(
                          'h-16 rounded-lg border px-2 py-1 text-[10px] leading-tight transition-colors',
                          statusBg[apt.status]
                        )}
                      >
                        <div className="font-semibold">{roomLabel} · {apt.area}м²</div>
                        <div className="opacity-90">{formatPrice(apt.price)}</div>
                        <div className="opacity-70">секц. {sec} · {statusLabel}</div>
                      </div>
                    );

                    if (!canOpen) {
                      return <div key={apt.id}>{cardBody}</div>;
                    }

                    return (
                      <Link key={apt.id} to={`/apartment/${apt.id}`}>
                        {cardBody}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Chessboard;

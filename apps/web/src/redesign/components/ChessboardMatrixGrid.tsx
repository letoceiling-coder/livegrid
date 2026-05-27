import { Fragment, memo } from 'react';
import { cn } from '@/lib/utils';
import type { ChessboardApartmentCell, ChessboardBuildingMatrix } from '@/redesign/lib/chessboard-api';
import type { Apartment } from '@/redesign/data/types';
import ChessboardCell from '@/redesign/components/ChessboardCell';
import { columnFingerprintCount, isFloorFullySoldFromGrid } from '@/redesign/lib/chessboard-board';
import { isChessDebugEnabled } from '@/redesign/lib/chessboard-observability';

const CELL_H = 86;
const FLOOR_COL_W = 42;
const SHAFT_MIN_W = 118;

type Props = {
  matrix: ChessboardBuildingMatrix;
  section?: number;
  selectedId: string | null;
  isHidden: (apt: Apartment) => boolean;
  roomLabel: (rooms: number) => string;
};

function cellToApartment(cell: ChessboardApartmentCell, section: number): Apartment {
  return {
    id: cell.id,
    complexId: '',
    buildingId: '',
    rooms: cell.rooms,
    area: cell.area,
    kitchenArea: 0,
    floor: cell.floor,
    totalFloors: 1,
    price: cell.price,
    pricePerMeter: cell.pricePerMeter,
    finishing: cell.finishing as Apartment['finishing'],
    status: cell.status,
    planImage: cell.planImage ?? '',
    section,
    number: cell.number,
  };
}

/**
 * Renders backend grid[][] as fixed CSS grid — no client matrix math, no null filtering.
 */
const ChessboardMatrixGrid = memo(function ChessboardMatrixGrid({
  matrix,
  section = 1,
  selectedId,
  isHidden,
  roomLabel,
}: Props) {
  const { floors, grid, shaftCount, columns } = matrix;
  const debug = isChessDebugEnabled();
  if (!shaftCount || !floors.length) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        В этой секции нет данных о квартирах
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-2 sm:p-3 max-h-[min(70vh,640px)] overscroll-x-contain">
      <div
        className="grid gap-1.5"
        style={{
          width: 'max-content',
          minWidth: '100%',
          gridTemplateColumns: `${FLOOR_COL_W}px repeat(${shaftCount}, ${SHAFT_MIN_W}px)`,
          gridTemplateRows: `24px repeat(${floors.length}, ${CELL_H}px)`,
          gridAutoFlow: 'row',
        }}
        role="presentation"
      >
        <div className="h-6" aria-hidden="true" />
        {Array.from({ length: shaftCount }, (_, i) => {
          const colDto = matrix.columns[i];
          const label = colDto?.shaftLabel ?? String(i + 1);
          return (
            <div
              key={`shaft-head-${i + 1}`}
              className="flex h-6 items-center justify-center text-[10px] font-medium text-muted-foreground truncate px-1"
              title={label}
            >
              {label}
            </div>
          );
        })}

        {floors.map((floor, rowIndex) => {
          const row = grid[rowIndex] ?? [];
          const fullySold = isFloorFullySoldFromGrid(row);
          return (
            <Fragment key={`floor-row-${floor}`}>
              <div
                className={cn(
                  'flex items-center justify-center rounded-lg text-xs font-medium sticky left-0 z-[2]',
                  fullySold ? 'bg-muted/40 text-muted-foreground' : 'bg-muted/20 text-muted-foreground',
                )}
                style={{ height: CELL_H }}
                title={fullySold ? 'Этаж полностью продан' : undefined}
              >
                {floor}
              </div>
              {Array.from({ length: shaftCount }, (_, colIndex) => {
                const colDto = columns[colIndex];
                const shaftId = colDto?.shaftId ?? matrix.shafts[colIndex]?.shaftId;
                const cell = row[colIndex] ?? { floor, shaftIndex: colIndex + 1, apartment: null };
                const aptCell = cell.apartment;
                if (!aptCell) {
                  return (
                    <div
                      key={`empty-${floor}-${shaftId ?? cell.shaftIndex}`}
                      className="rounded-lg border border-dashed border-border/60 bg-muted/10"
                      style={{ height: CELL_H, minWidth: SHAFT_MIN_W }}
                      aria-hidden="true"
                      data-empty="true"
                      data-floor={floor}
                      data-shaft={cell.shaftIndex}
                      data-shaft-id={shaftId}
                    />
                  );
                }
                const apt = cellToApartment(aptCell, section);
                const hidden = isHidden(apt);
                return (
                  <ChessboardCell
                    key={`cell-${floor}-${shaftId ?? cell.shaftIndex}-${apt.id}`}
                    apartment={apt}
                    section={section}
                    hidden={hidden}
                    selected={selectedId === apt.id}
                    roomLabel={roomLabel(apt.rooms)}
                    dataShaftId={debug ? shaftId : undefined}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

export default ChessboardMatrixGrid;

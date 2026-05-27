import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Apartment } from '@/redesign/data/types';
import ChessboardCell from '@/redesign/components/ChessboardCell';
import ChessboardPreview, { ChessboardPreviewInline } from '@/redesign/components/ChessboardPreview';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  CHESS_STATUS_LABEL,
  CHESS_STATUS_ORDER,
  CHESS_SWATCH_CLASS,
  type ChessStatusKey,
} from '@/redesign/lib/chessboard-status';
import {
  buildSectionBoards,
  countByStatus,
  isFloorFullySold,
  sectionNumbersFrom,
  type SectionBoard,
} from '@/redesign/lib/chessboard-board';
import {
  chessObsHoverEnd,
  chessObsHoverStart,
  chessObsRegisterRender,
  chessObsSelection,
} from '@/redesign/lib/chessboard-observability';
import { roomCategoryFromRooms } from '@/redesign/lib/complex-room-groups';

export type ChessboardBuildingOption = {
  id: string;
  name: string;
  apartmentCount: number;
};

interface Props {
  apartments: Apartment[];
  floors: number;
  sections: number;
  buildingName: string;
  roomFilter?: number | null;
  /** When multiple towers/corpuses — TrendAgent-style tabs above the grid. */
  buildingOptions?: ChessboardBuildingOption[];
  activeBuildingId?: string | null;
  onBuildingChange?: (id: string) => void;
}

function roomLabel(rooms: number): string {
  if (rooms === 0) return 'Студия';
  if (rooms > 0) return `${rooms}-к.кв`;
  return '';
}

function sectionTitle(section: number, buildingName: string): string {
  const normalizedName = buildingName.trim();
  return `Секция ${section}${normalizedName ? ` · ${normalizedName}` : ''}`;
}

function useIsMobileChess(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const fn = () => setMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return mobile;
}

const Chessboard = ({
  apartments,
  floors,
  sections,
  buildingName,
  roomFilter = null,
  buildingOptions,
  activeBuildingId,
  onBuildingChange,
}: Props) => {
  const navigate = useNavigate();
  const isMobile = useIsMobileChess();
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverStartRef = useRef(0);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewHoveredRef = useRef(false);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      if (!previewHoveredRef.current) setHoverPreview(null);
    }, 160);
  }, [clearHoverCloseTimer]);

  useEffect(() => () => clearHoverCloseTimer(), [clearHoverCloseTimer]);

  const counts = useMemo(() => countByStatus(apartments), [apartments]);

  const [activeStatuses, setActiveStatuses] = useState<Set<ChessStatusKey>>(
    () => new Set<ChessStatusKey>(['available', 'reserved', 'sold']),
  );
  const [activeSectionTab, setActiveSectionTab] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    apt: Apartment;
    section: number;
    rect: DOMRect;
  } | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetApt, setMobileSheetApt] = useState<{ apt: Apartment; section: number } | null>(
    null,
  );

  const sectionNumbers = useMemo(
    () => sectionNumbersFrom(apartments, sections),
    [apartments, sections],
  );

  const sectionBoards = useMemo(
    () => buildSectionBoards(apartments, floors, sectionNumbers),
    [apartments, floors, sectionNumbers],
  );

  const visibleBoards = useMemo(() => {
    if (sectionBoards.length <= 1) return sectionBoards;
    if (activeSectionTab != null) {
      return sectionBoards.filter((b) => b.section === activeSectionTab);
    }
    return sectionBoards;
  }, [sectionBoards, activeSectionTab]);

  useEffect(() => {
    if (sectionBoards.length <= 1) {
      setActiveSectionTab(null);
      return;
    }
    if (activeSectionTab == null || !sectionBoards.some((b) => b.section === activeSectionTab)) {
      setActiveSectionTab(sectionBoards[0]?.section ?? null);
    }
  }, [sectionBoards, activeSectionTab]);

  const visibleCellCount = useMemo(
    () => visibleBoards.reduce((s, b) => s + b.columns.reduce((cs, col) => cs + col.filter(Boolean).length, 0), 0),
    [visibleBoards],
  );

  useEffect(() => {
    chessObsRegisterRender({
      apartmentCount: apartments.length,
      visibleCellCount,
      sectionCount: sectionBoards.length,
      floorCount: Math.max(...sectionBoards.map((b) => b.floors.length), 0),
    });
  }, [apartments.length, visibleCellCount, sectionBoards]);

  const toggleStatus = (s: ChessStatusKey) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const aptById = useMemo(() => {
    const m = new Map<string, Apartment>();
    for (const a of apartments) m.set(a.id, a);
    return m;
  }, [apartments]);

  const isHidden = useCallback(
    (apt: Apartment) =>
      !activeStatuses.has(apt.status) ||
      (roomFilter !== null && roomCategoryFromRooms(apt.rooms) !== roomFilter),
    [activeStatuses, roomFilter],
  );

  const resolveCellContext = useCallback(
    (el: HTMLElement): { apt: Apartment; section: number } | null => {
      const cell = el.closest('[data-apt-id]') as HTMLElement | null;
      if (!cell) return null;
      const id = cell.dataset.aptId;
      if (!id) return null;
      const apt = aptById.get(id);
      if (!apt) return null;
      const section = Number(cell.dataset.section ?? 1) || 1;
      return { apt, section };
    },
    [aptById],
  );

  const openMobileSheet = useCallback((apt: Apartment, section: number) => {
    setMobileSheetApt({ apt, section });
    setMobileSheetOpen(true);
    setSelectedId(apt.id);
  }, []);

  const handleGridMouseOver = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const ctx = resolveCellContext(e.target as HTMLElement);
      if (!ctx || ctx.apt.status === 'sold' || isHidden(ctx.apt)) {
        setHoverPreview(null);
        return;
      }
      const cell = (e.target as HTMLElement).closest('[data-apt-id]') as HTMLElement;
      if (!cell) return;
      clearHoverCloseTimer();
      hoverStartRef.current = chessObsHoverStart(ctx.apt.id);
      const rect = cell.getBoundingClientRect();
      setHoverPreview({ apt: ctx.apt, section: ctx.section, rect });
      requestAnimationFrame(() => {
        chessObsHoverEnd(performance.now() - hoverStartRef.current);
      });
    },
    [isMobile, resolveCellContext, isHidden, clearHoverCloseTimer],
  );

  const handleGridMouseLeave = useCallback(() => {
    if (!isMobile) scheduleHoverClose();
  }, [isMobile, scheduleHoverClose]);

  useEffect(() => {
    if (!hoverPreview || isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearHoverCloseTimer();
        previewHoveredRef.current = false;
        setHoverPreview(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hoverPreview, isMobile, clearHoverCloseTimer]);

  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const ctx = resolveCellContext(e.target as HTMLElement);
      if (!ctx) return;
      const { apt, section } = ctx;
      if (apt.status === 'sold' || isHidden(apt)) return;

      const startedAt = performance.now();
      setSelectedId(apt.id);
      chessObsSelection(apt.id, startedAt);

      if (isMobile) {
        e.preventDefault();
        openMobileSheet(apt, section);
        return;
      }

      if (e.detail === 2) {
        navigate(`/apartment/${apt.id}`);
      }
    },
    [resolveCellContext, isHidden, isMobile, openMobileSheet, navigate],
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.matches('[data-apt-id]')) return;
      const id = target.dataset.aptId;
      if (!id) return;
      const apt = aptById.get(id);
      if (!apt) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (apt.status !== 'sold' && !isHidden(apt)) {
          navigate(`/apartment/${apt.id}`);
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const cells = Array.from(
          gridRef.current?.querySelectorAll<HTMLElement>('[data-interactive="true"]') ?? [],
        );
        const idx = cells.indexOf(target);
        if (idx < 0) return;
        const delta =
          e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? 1 : -1;
        const next = cells[idx + delta];
        next?.focus();
        const nextId = next?.dataset.aptId;
        const nextApt = nextId ? aptById.get(nextId) : null;
        if (nextApt) setSelectedId(nextApt.id);
      }
    },
    [aptById, isHidden, navigate],
  );

  const selectedApt = selectedId ? aptById.get(selectedId) ?? null : null;
  const selectedSection = useMemo(() => {
    if (!selectedApt) return 0;
    for (const board of sectionBoards) {
      for (const col of board.columns) {
        if (col.some((a) => a?.id === selectedApt.id)) return board.section;
      }
    }
    return Number(selectedApt.section ?? 1) || 1;
  }, [selectedApt, sectionBoards]);

  const previewPosition = useMemo(() => {
    if (!hoverPreview || isMobile) return null;
    const { rect } = hoverPreview;
    const previewW = 280;
    const previewH = 380;
    let left = rect.right + 8;
    let top = rect.top;
    if (left + previewW > window.innerWidth - 8) left = rect.left - previewW - 8;
    if (top + previewH > window.innerHeight - 8) top = window.innerHeight - previewH - 8;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    return { left, top };
  }, [hoverPreview, isMobile]);

  const renderBoard = (board: SectionBoard) => (
    <div key={board.section} className="overflow-hidden rounded-xl border border-border bg-card">
      {sectionBoards.length > 1 && activeSectionTab == null ? (
        <div className="border-b border-border bg-muted/20 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          {sectionTitle(board.section, buildingName)}
          <span className="ml-2 text-muted-foreground/80">
            {board.availableCount} своб. / {board.totalCount}
          </span>
        </div>
      ) : null}

      {board.columns.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          В этой секции нет данных о квартирах
        </div>
      ) : (
        <div className="overflow-x-auto p-2 sm:p-3 max-h-[min(70vh,640px)]">
          <div
            className="inline-grid gap-1"
            style={{
              minWidth: 'min-content',
              gridTemplateColumns: `42px repeat(${Math.max(board.columns.length, 1)}, min(118px, 28vw))`,
            }}
          >
            <div className="h-6" aria-hidden="true" />
            {board.columns.map((_, idx) => (
              <div
                key={`col-head-${board.section}-${idx}`}
                className="h-6 text-center text-[11px] text-muted-foreground"
              >
                {idx + 1}
              </div>
            ))}

            {board.floors.map((floor, rowIndex) => {
              const fullySold = isFloorFullySold(board, floor);
              return (
                <Fragment key={`row-${board.section}-${floor}`}>
                  <div
                    className={cn(
                      'flex h-[86px] items-center justify-center rounded-lg text-xs font-medium sticky left-0 z-[2]',
                      fullySold
                        ? 'bg-muted/40 text-muted-foreground'
                        : 'bg-muted/20 text-muted-foreground',
                    )}
                    title={fullySold ? 'Этаж полностью продан' : undefined}
                  >
                    {floor}
                  </div>
                  {board.columns.map((column, colIndex) => {
                    const apt = column[rowIndex] ?? null;
                    if (!apt) {
                      return (
                        <div
                          key={`empty-${board.section}-${floor}-${colIndex}`}
                          className="h-[86px] rounded-lg border border-dashed border-border/50 bg-muted/10"
                          aria-hidden="true"
                        />
                      );
                    }
                    const hidden = isHidden(apt);
                    return (
                      <ChessboardCell
                        key={apt.id}
                        apartment={apt}
                        section={board.section}
                        hidden={hidden}
                        selected={selectedId === apt.id}
                        roomLabel={roomLabel(apt.rooms)}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const showBuildingTabs =
    buildingOptions && buildingOptions.length > 1 && onBuildingChange != null;

  return (
    <div className="space-y-4">
      {showBuildingTabs ? (
        <div
          className="flex gap-0 overflow-x-auto border-b border-border/60 scrollbar-hide"
          role="tablist"
          aria-label="Корпуса и башни"
        >
          {buildingOptions.map((b) => {
            const active = b.id === (activeBuildingId ?? buildingOptions[0]?.id);
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onBuildingChange(b.id)}
                className={cn(
                  'relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
                )}
              >
                {b.name}
                <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">
                  ({b.apartmentCount})
                </span>
                <span
                  className={cn(
                    'absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{buildingName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.available} свободных · {counts.reserved} в брони · {counts.sold} продано
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Фильтр статусов">
          {CHESS_STATUS_ORDER.map((s) => {
            const isActive = activeStatuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={isActive}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
                  isActive
                    ? 'border-foreground/20 bg-background text-foreground'
                    : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <span className={cn('w-3 h-3 rounded border', CHESS_SWATCH_CLASS[s])} />
                <span>{CHESS_STATUS_LABEL[s]}</span>
                <span className="ml-1 text-muted-foreground tabular-nums">{counts[s]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {sectionBoards.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Секции">
          {sectionBoards.map((board) => (
            <button
              key={board.section}
              type="button"
              role="tab"
              aria-selected={activeSectionTab === board.section}
              onClick={() => setActiveSectionTab(board.section)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                activeSectionTab === board.section
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              Секция {board.section}
              <span className="ml-1.5 text-muted-foreground">{board.availableCount} св.</span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={gridRef}
        role="grid"
        aria-label={`Шахматка ${buildingName}`}
        onMouseOver={handleGridMouseOver}
        onMouseLeave={handleGridMouseLeave}
        onClick={handleGridClick}
        onKeyDown={handleGridKeyDown}
        className="space-y-4"
      >
        {visibleBoards.map(renderBoard)}
      </div>

      {!isMobile && hoverPreview && previewPosition
        ? createPortal(
            <div
              className="fixed z-[70] w-[280px] rounded-xl border border-border bg-popover p-3 shadow-xl pointer-events-auto transition-opacity duration-150"
              style={{ left: previewPosition.left, top: previewPosition.top }}
              role="dialog"
              aria-label="Превью квартиры"
              onMouseEnter={() => {
                previewHoveredRef.current = true;
                clearHoverCloseTimer();
              }}
              onMouseLeave={() => {
                previewHoveredRef.current = false;
                scheduleHoverClose();
              }}
            >
              <ChessboardPreview
                apartment={hoverPreview.apt}
                buildingName={buildingName}
                section={hoverPreview.section}
                roomLabel={roomLabel(hoverPreview.apt.rooms)}
              />
            </div>,
            document.body,
          )
        : null}

      {isMobile && selectedApt ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <ChessboardPreviewInline
            apartment={selectedApt}
            buildingName={buildingName}
            section={selectedSection}
          />
        </div>
      ) : null}

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Квартира</SheetTitle>
          </SheetHeader>
          {mobileSheetApt ? (
            <ChessboardPreview
              apartment={mobileSheetApt.apt}
              buildingName={buildingName}
              section={mobileSheetApt.section}
              roomLabel={roomLabel(mobileSheetApt.apt.rooms)}
              onClose={() => setMobileSheetOpen(false)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <p className="text-[11px] text-muted-foreground">
        {isMobile
          ? 'Нажмите на квартиру для просмотра. Доступные — белые, бронь — жёлтые, продано — тёмные.'
          : 'Наведите для превью — карточка остаётся при наведении на неё, «Открыть» кликабелен. Двойной клик по ячейке — страница квартиры. Esc — закрыть.'}
      </p>
    </div>
  );
};

export default Chessboard;

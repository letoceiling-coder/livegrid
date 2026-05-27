/** Minimal apartment fields required to build a chessboard matrix. */
export type ChessboardApartmentInput = {
  id: string;
  number?: string | null;
  floor: number;
  rooms: number;
  area: number;
  price: number;
  pricePerMeter?: number;
  finishing?: string;
  status: 'available' | 'reserved' | 'sold';
  section?: number;
  planImage?: string | null;
};

export type ChessboardApartmentCell = {
  id: string;
  number: string;
  floor: number;
  rooms: number;
  roomLabel: string;
  area: number;
  layoutFingerprint: string;
  price: number;
  pricePerMeter: number;
  finishing: string;
  status: 'available' | 'reserved' | 'sold';
  section: number;
  planImage: string | null;
};

export type ChessboardGridCell = {
  floor: number;
  shaftIndex: number;
  apartment: ChessboardApartmentCell | null;
};

export type ChessboardColumnDto = {
  shaftIndex: number;
  /**
   * Diagnostic key describing this shaft's dominant layout.
   * Format: "N-к|{area}" or "Студия|{area}" — derived from the most common
   * apartment fingerprint in this column. Useful for debug overlays.
   */
  shaftLabel: string;
  cells: Array<{ floor: number; apartment: ChessboardApartmentCell | null }>;
};

export type ChessboardBuildingMatrix = {
  id: string;
  name: string;
  tabLabel: string;
  apartmentCount: number;
  statusCounts: { available: number; reserved: number; sold: number };
  floors: number[];
  shaftCount: number;
  columns: ChessboardColumnDto[];
  /** Row-major: grid[floorRowIndex][shaftIndex]. Source of truth for rendering. */
  grid: ChessboardGridCell[][];
};

export type ChessboardBlockResponse = {
  blockId: number;
  slug: string;
  name: string;
  buildings: ChessboardBuildingMatrix[];
};

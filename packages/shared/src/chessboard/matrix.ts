import type { ChessboardApartmentInput } from './types.js';
import { buildBuildingTopology, type BuildingTopologyGraph } from './topology.js';

export { apartmentNumber, layoutFingerprint, matchScore } from './matrix-core.js';
export {
  architecturalSignature,
  planSignature,
  stableFloorOrder,
  verticalMatchScore,
} from './signature.js';
export {
  buildBuildingTopology,
  topologyArchitecturalSignature,
  VERTICAL_LINK_MAX_SCORE,
  type ArchitecturalShaft,
  type BuildingTopologyGraph,
  type FloorTemplate,
  type FloorTemplateSlot,
} from './topology.js';

export type ShaftMatrix = {
  /** Floors descending (top → bottom). */
  floors: number[];
  /** columns[shaftIndex][floorRowIndex] — null = architectural placeholder (empty slot). */
  columns: Array<Array<ChessboardApartmentInput | null>>;
};

export type ArchitecturalMatrixResult = {
  matrix: ShaftMatrix;
  topology: BuildingTopologyGraph;
};

function matrixFromTopology(
  apartments: ChessboardApartmentInput[],
  topology: BuildingTopologyGraph,
): ShaftMatrix {
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const floors = topology.floorTemplates.map((t) => t.floor);
  const columns = topology.shafts.map((shaft, colIdx) =>
    floors.map((floor) => {
      const template = topology.floorTemplates.find((t) => t.floor === floor);
      const slot = template?.slots[colIdx];
      if (!slot?.apartmentId) return null;
      return byId.get(slot.apartmentId) ?? null;
    }),
  );

  return { floors, columns };
}

/**
 * ARCHITECTURAL MATRIX ENGINE v4
 *
 * Topology graph (union-find on optimal adjacent-floor matching) defines shaft
 * entities; floor templates materialize placeholders; matrix is a projection.
 */
export function buildArchitecturalMatrixWithTopology(
  apartments: ChessboardApartmentInput[],
): ArchitecturalMatrixResult {
  if (!apartments.length) {
    const empty: BuildingTopologyGraph = {
      sectionCount: 1,
      shafts: [],
      floorTemplates: [],
      apartmentToShaft: {},
    };
    return { matrix: { floors: [], columns: [] }, topology: empty };
  }

  const topology = buildBuildingTopology(apartments);
  const matrix = matrixFromTopology(apartments, topology);
  return { matrix, topology };
}

export function buildArchitecturalMatrix(apartments: ChessboardApartmentInput[]): ShaftMatrix {
  return buildArchitecturalMatrixWithTopology(apartments).matrix;
}

/** @deprecated Use buildArchitecturalMatrix — kept for existing imports. */
export const buildShaftMatrix = buildArchitecturalMatrix;

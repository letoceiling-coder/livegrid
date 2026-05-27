import type { ChessboardApartmentInput } from './types.js';
import { apartmentNumber, layoutFingerprint, matchScore } from './matrix-core.js';

/** Normalized plan identity for vertical shaft matching (pathname only, no query). */
export function planSignature(apt: ChessboardApartmentInput): string {
  const raw = apt.planImage?.trim();
  if (!raw) return '';
  const base = raw.split('?')[0]!.toLowerCase();
  const pathMatch = base.match(/^https?:\/\/[^/]+(\/.*)$/);
  return pathMatch?.[1] ?? base;
}

/** Primary architectural key: exact plan path, else layout fingerprint. */
export function architecturalSignature(apt: ChessboardApartmentInput): string {
  const plan = planSignature(apt);
  if (plan) return `plan:${plan}`;
  return `fp:${layoutFingerprint(apt)}`;
}

const MIRRORED_AREA_TOLERANCE = 0.65;

/**
 * Lower is better. Exact plan match = 0; mirrored same layout = 5; else layout distance.
 */
export function verticalMatchScore(
  a: ChessboardApartmentInput,
  b: ChessboardApartmentInput,
): number {
  const planA = planSignature(a);
  const planB = planSignature(b);
  if (planA && planB && planA === planB) return 0;

  const sigA = architecturalSignature(a);
  const sigB = architecturalSignature(b);
  if (sigA === sigB && sigA.startsWith('fp:')) return 0;

  if (
    a.rooms === b.rooms &&
    Math.abs(a.area - b.area) <= MIRRORED_AREA_TOLERANCE &&
    planA &&
    planB &&
    planA !== planB
  ) {
    return 5;
  }

  return matchScore(a, b);
}

/** Stable within-floor ordering for tie-breaks only (not column assignment). */
export function stableFloorOrder(a: ChessboardApartmentInput, b: ChessboardApartmentInput): number {
  return (
    apartmentNumber(a) - apartmentNumber(b) ||
    a.area - b.area ||
    a.id.localeCompare(b.id)
  );
}

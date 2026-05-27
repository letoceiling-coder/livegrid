import type { ChessboardApartmentInput } from './types.js';
import { layoutFingerprint } from './matrix-core.js';
import { planSignature } from './signature.js';

/** Layout bucket for mirrored variants (same rooms + area, different plan asset). */
export function layoutGroupKey(apt: ChessboardApartmentInput): string {
  return layoutFingerprint(apt);
}

export function collectMirrorVariants(
  apartments: Iterable<ChessboardApartmentInput>,
): Map<string, Set<string>> {
  const byLayout = new Map<string, Set<string>>();
  for (const apt of apartments) {
    const layout = layoutGroupKey(apt);
    const plan = planSignature(apt);
    if (!plan) continue;
    const set = byLayout.get(layout) ?? new Set<string>();
    set.add(plan);
    byLayout.set(layout, set);
  }
  return byLayout;
}

export function mirroredPlanSignaturesForLayout(
  apartments: ChessboardApartmentInput[],
  dominantLayout: string,
): string[] {
  const plans = new Set<string>();
  for (const apt of apartments) {
    if (layoutGroupKey(apt) !== dominantLayout) continue;
    const plan = planSignature(apt);
    if (plan) plans.add(plan);
  }
  return [...plans].sort();
}

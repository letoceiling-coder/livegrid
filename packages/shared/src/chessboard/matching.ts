/**
 * Minimum-cost bipartite assignment (no greedy column picking).
 * Sized for chessboard floors (typically ≤ 6 apartments per floor).
 */

const INF = 1e9;

/** Pad to square matrix and run Hungarian; returns left[i] → right index or -1. */
export function minCostAssignment(cost: number[][]): number[] {
  const nRows = cost.length;
  if (!nRows) return [];
  const nCols = cost[0]?.length ?? 0;
  if (!nCols) return new Array(nRows).fill(-1);

  const n = Math.max(nRows, nCols);
  const a: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i >= nRows || j >= nCols) return INF;
      return cost[i]![j]!;
    }),
  );

  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0]!;
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j += 1) {
        if (used[j]) continue;
        const cur = a[i0 - 1]![j - 1]! - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j += 1) {
        if (used[j]) {
          u[p[j]!] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0]!;
      p[j0] = p[j1]!;
      j0 = j1;
    } while (j0 !== 0);
  }

  const rightOfLeft = new Array(nRows).fill(-1);
  for (let j = 1; j <= n; j += 1) {
    const leftIdx = p[j]! - 1;
    const rightIdx = j - 1;
    if (leftIdx >= 0 && leftIdx < nRows && rightIdx >= 0 && rightIdx < nCols) {
      if (cost[leftIdx]![rightIdx]! < INF / 2) {
        rightOfLeft[leftIdx] = rightIdx;
      }
    }
  }
  return rightOfLeft;
}

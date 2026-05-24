import type { ConfigService } from '@nestjs/config';

const DEFAULT_PARITY: Record<string, { donorApartments: number; donorBlocks: number }> = {
  msk: { donorApartments: 67_000, donorBlocks: 462 },
  belgorod: { donorApartments: 1_000, donorBlocks: 30 },
};

/** Per-region donor parity targets — env FEED_PARITY_TARGETS_MSK=67000:462 or code defaults. */
export function getParityTargets(
  regionCode: string,
  config: ConfigService,
): { donorApartments: number; donorBlocks: number } {
  const code = regionCode.trim().toLowerCase();
  const envKey = `FEED_PARITY_TARGETS_${code.toUpperCase()}`;
  const envVal = config.get<string>(envKey);
  if (envVal?.includes(':')) {
    const [aptRaw, blkRaw] = envVal.split(':');
    const apt = Number(aptRaw);
    const blk = Number(blkRaw);
    if (Number.isFinite(apt) && apt > 0 && Number.isFinite(blk) && blk > 0) {
      return { donorApartments: apt, donorBlocks: blk };
    }
  }
  return DEFAULT_PARITY[code] ?? { donorApartments: 10_000, donorBlocks: 100 };
}

export function parityPercent(actual: number, target: number): number | null {
  if (actual <= 0 || target <= 0) return null;
  return Math.round((actual / target) * 1000) / 10;
}

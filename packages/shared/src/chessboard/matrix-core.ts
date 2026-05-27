import type { ChessboardApartmentInput } from './types.js';

const AREA_MATCH_TOLERANCE = 4;
const ROOM_MISMATCH_PENALTY = 1000;

export function apartmentNumber(apt: ChessboardApartmentInput): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function layoutFingerprint(apt: ChessboardApartmentInput): string {
  const area = Math.round(apt.area * 10) / 10;
  return `${apt.rooms}|${area}`;
}

export function matchScore(a: ChessboardApartmentInput, b: ChessboardApartmentInput): number {
  const roomPenalty = a.rooms !== b.rooms ? ROOM_MISMATCH_PENALTY : 0;
  const areaDiff = Math.abs(a.area - b.area);
  return roomPenalty + (areaDiff > AREA_MATCH_TOLERANCE ? areaDiff : 0);
}

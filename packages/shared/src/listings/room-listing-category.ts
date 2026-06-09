export type RoomTypeRef = {
  id: number;
  name: string;
  nameOne?: string | null;
  crmId?: string | number | bigint | null;
};

/** room_types for feed/manual «Комнаты» category (TrendAgent crm_id=100). */
export function resolveRoomListingTypeIds(roomTypes: RoomTypeRef[] | undefined): number[] {
  if (!roomTypes?.length) return [];
  return roomTypes
    .filter((rt) => {
      const crm = rt.crmId != null ? String(rt.crmId) : '';
      if (crm === '100') return true;
      const label = (rt.nameOne ?? rt.name ?? '').trim().toLowerCase();
      if (!label) return false;
      if (label.includes('к.кв') || label.includes('комнатная') || label.includes('студ')) return false;
      return label === 'комнаты' || label === 'комната' || label.startsWith('комнат');
    })
    .map((rt) => rt.id);
}

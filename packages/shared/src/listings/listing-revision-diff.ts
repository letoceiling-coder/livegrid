import type { WizardServerPayload } from './wizard-payload.js';

export type RevisionFieldDiff = {
  key: string;
  label: string;
  category: 'core' | 'geo' | 'characteristics' | 'ownership' | 'visibility';
  live: string;
  pending: string;
  changed: boolean;
};

export type RevisionMediaDiff = {
  mainPhotoChanged: boolean;
  planChanged: boolean;
  liveMain: string;
  pendingMain: string;
  livePlan: string;
  pendingPlan: string;
  added: string[];
  removed: string[];
  reordered: boolean;
  liveGallery: string[];
  pendingGallery: string[];
};

export type RevisionDiffResult = {
  fields: RevisionFieldDiff[];
  media: RevisionMediaDiff;
  hasChanges: boolean;
  changedFieldCount: number;
};

function norm(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  return String(v).trim();
}

function pickGroup(payload: WizardServerPayload): Record<string, string | boolean> {
  const k = payload.kind;
  if (k === 'APARTMENT' || k === 'ROOM') return payload.apartment;
  if (k === 'HOUSE' || k === 'DACHA') return payload.house;
  if (k === 'LAND') return payload.land;
  if (k === 'COMMERCIAL') return payload.commercial;
  return payload.parking;
}

const GROUP_FIELD_LABELS: Record<string, string> = {
  areaTotal: 'Площадь',
  areaKitchen: 'Кухня, м²',
  floor: 'Этаж',
  floorsTotal: 'Этажей в доме',
  roomTypeId: 'Комнатность',
  finishingId: 'Отделка',
  buildingName: 'Корпус',
  number: 'Номер',
  blockAddress: 'Адрес объекта',
  marketSegment: 'Тип рынка',
  houseType: 'Тип дома',
  material: 'Материал',
  areaLand: 'Участок, сот.',
  floorsCount: 'Этажей',
  bedrooms: 'Спален',
  bathrooms: 'Санузлов',
  settlement: 'Населённый пункт',
  street: 'Улица',
  houseNumber: 'Дом',
  districtName: 'Район',
  description: 'Описание',
  yearBuilt: 'Год постройки',
  hasGarage: 'Гараж',
  areaSotki: 'Площадь, сот.',
  landCategory: 'Категория земли',
  cadastralNumber: 'Кадастровый номер',
  hasCommunications: 'Коммуникации',
  commercialType: 'Тип коммерции',
  area: 'Площадь, м²',
  hasSeparateEntrance: 'Отдельный вход',
  parkingType: 'Тип паркинга',
};

function diffMedia(live: WizardServerPayload, pending: WizardServerPayload): RevisionMediaDiff {
  const liveMain = norm(live.mainPhotoUrl);
  const pendingMain = norm(pending.mainPhotoUrl);
  const livePlan = norm(live.planUrl);
  const pendingPlan = norm(pending.planUrl);
  const liveGallery = [...live.extraPhotoUrls];
  const pendingGallery = [...pending.extraPhotoUrls];
  const liveSet = new Set(liveGallery);
  const pendingSet = new Set(pendingGallery);
  const added = pendingGallery.filter((u) => !liveSet.has(u));
  const removed = liveGallery.filter((u) => !pendingSet.has(u));
  const sameMultiset =
    liveGallery.length === pendingGallery.length &&
    liveGallery.every((u, i) => u === pendingGallery[i]);
  const reordered =
    liveGallery.length === pendingGallery.length &&
    !sameMultiset &&
    added.length === 0 &&
    removed.length === 0;

  return {
    mainPhotoChanged: liveMain !== pendingMain,
    planChanged: livePlan !== pendingPlan,
    liveMain,
    pendingMain,
    livePlan,
    pendingPlan,
    added,
    removed,
    reordered,
    liveGallery,
    pendingGallery,
  };
}

export function diffWizardPayloads(
  live: WizardServerPayload,
  pending: WizardServerPayload,
): RevisionDiffResult {
  const fields: RevisionFieldDiff[] = [];

  const corePairs: Array<[string, string, RevisionFieldDiff['category']]> = [
    ['kind', 'Тип объекта', 'core'],
    ['price', 'Цена, ₽', 'core'],
    ['address', 'Адрес', 'geo'],
    ['lat', 'Широта', 'geo'],
    ['lng', 'Долгота', 'geo'],
    ['regionId', 'Регион ID', 'geo'],
    ['blockId', 'ЖК ID', 'geo'],
    ['ownerUserId', 'Ответственный', 'ownership'],
    ['ownerMode', 'Режим владения', 'ownership'],
    ['publishAction', 'Действие публикации', 'visibility'],
  ];

  for (const [key, label, category] of corePairs) {
    const l = norm((live as Record<string, unknown>)[key]);
    const p = norm((pending as Record<string, unknown>)[key]);
    fields.push({ key, label, category, live: l || '—', pending: p || '—', changed: l !== p });
  }

  const liveGroup = pickGroup(live);
  const pendingGroup = pickGroup(pending);
  const keys = new Set([...Object.keys(liveGroup), ...Object.keys(pendingGroup)]);
  for (const key of keys) {
    const l = norm(liveGroup[key]);
    const p = norm(pendingGroup[key]);
    fields.push({
      key: `kind.${key}`,
      label: GROUP_FIELD_LABELS[key] ?? key,
      category: 'characteristics',
      live: l || '—',
      pending: p || '—',
      changed: l !== p,
    });
  }

  const sellerKeys = ['fullName', 'phone', 'email', 'address'] as const;
  const sellerLabels: Record<string, string> = {
    fullName: 'Продавец',
    phone: 'Телефон',
    email: 'Email',
    address: 'Адрес продавца',
  };
  for (const sk of sellerKeys) {
    const l = norm(live.seller?.[sk]);
    const p = norm(pending.seller?.[sk]);
    fields.push({
      key: `seller.${sk}`,
      label: sellerLabels[sk],
      category: 'core',
      live: l || '—',
      pending: p || '—',
      changed: l !== p,
    });
  }

  const media = diffMedia(live, pending);
  const changedFieldCount =
    fields.filter((f) => f.changed).length +
    (media.mainPhotoChanged ? 1 : 0) +
    (media.planChanged ? 1 : 0) +
    media.added.length +
    media.removed.length +
    (media.reordered ? 1 : 0);

  return {
    fields,
    media,
    hasChanges: changedFieldCount > 0,
    changedFieldCount,
  };
}

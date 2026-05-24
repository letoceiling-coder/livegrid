import { ListingKind } from '../enums/listing-kind.js';

/** UI-facing wizard kinds — ROOM/DACHA map to APARTMENT/HOUSE on persist. */
export type ListingWizardUiKind =
  | 'APARTMENT'
  | 'ROOM'
  | 'HOUSE'
  | 'DACHA'
  | 'LAND'
  | 'COMMERCIAL'
  | 'PARKING';

export type ListingFieldType =
  | 'text'
  | 'number'
  | 'integer'
  | 'select'
  | 'boolean'
  | 'textarea';

export type ListingFieldDefinition = {
  key: string;
  label: string;
  type: ListingFieldType;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  /** Reference data key, e.g. room-types, finishings */
  refKey?: 'room-types' | 'finishings';
  /** Static select options */
  options?: readonly { value: string; label: string }[];
  /** Which nested draft bucket: apartment | house | land | commercial | parking */
  group: 'apartment' | 'house' | 'land' | 'commercial' | 'parking';
  colSpan?: 1 | 2;
};

export const LISTING_WIZARD_UI_KIND_LABELS: Record<
  ListingWizardUiKind,
  { title: string; hint: string; apiKind: ListingKind }
> = {
  APARTMENT: { title: 'Квартира', hint: 'Жилая квартира в ЖК или вторичка', apiKind: ListingKind.APARTMENT },
  ROOM: { title: 'Комната', hint: 'Комната в квартире или общежитии', apiKind: ListingKind.APARTMENT },
  HOUSE: { title: 'Дом', hint: 'Частный дом, таунхаус, дуплекс', apiKind: ListingKind.HOUSE },
  DACHA: { title: 'Дача', hint: 'Дачный дом или коттедж', apiKind: ListingKind.HOUSE },
  LAND: { title: 'Участок', hint: 'Земельный участок (ИЖС, СНТ)', apiKind: ListingKind.LAND },
  COMMERCIAL: { title: 'Коммерция', hint: 'Офис, магазин, склад', apiKind: ListingKind.COMMERCIAL },
  PARKING: { title: 'Паркинг', hint: 'Машиноместо', apiKind: ListingKind.PARKING },
};

export function resolveWizardApiKind(uiKind: ListingWizardUiKind): ListingKind {
  return LISTING_WIZARD_UI_KIND_LABELS[uiKind].apiKind;
}

const houseTypeOptions = [
  { value: 'DETACHED', label: 'Отдельно стоящий' },
  { value: 'SEMI', label: 'Сблокированный / полудуплекс' },
  { value: 'TOWNHOUSE', label: 'Таунхаус' },
  { value: 'DUPLEX', label: 'Дуплекс' },
] as const;

const commercialTypeOptions = [
  { value: 'OFFICE', label: 'Офис' },
  { value: 'RETAIL', label: 'Магазин / торговое помещение' },
  { value: 'WAREHOUSE', label: 'Склад' },
  { value: 'RESTAURANT', label: 'Общепит' },
  { value: 'OTHER', label: 'Другое' },
] as const;

const parkingTypeOptions = [
  { value: 'UNDERGROUND', label: 'Подземный' },
  { value: 'GROUND', label: 'Наземный' },
  { value: 'MULTILEVEL', label: 'Многоуровневый' },
] as const;

const marketSegmentOptions = [
  { value: 'auto', label: 'Авто / не указано' },
  { value: 'NEW_BUILDING', label: 'Новостройка' },
  { value: 'SECONDARY', label: 'Вторичка' },
] as const;

const materialOptions = [
  { value: 'Панель', label: 'Панель' },
  { value: 'Кирпич', label: 'Кирпич' },
  { value: 'Блок', label: 'Блок' },
  { value: 'Монолит', label: 'Монолит' },
  { value: 'Железобетон', label: 'Железобетон' },
  { value: 'Дерево', label: 'Дерево' },
  { value: 'Металл', label: 'Металл' },
] as const;

/** Per-UI-kind dynamic parameter fields (schema-driven form engine). */
export const LISTING_FIELD_REGISTRY: Record<ListingWizardUiKind, ListingFieldDefinition[]> = {
  APARTMENT: [
    { key: 'blockAddress', label: 'Адрес объекта', type: 'text', group: 'apartment', colSpan: 2 },
    { key: 'marketSegment', label: 'Тип рынка', type: 'select', options: marketSegmentOptions, group: 'apartment', colSpan: 2 },
    { key: 'areaTotal', label: 'Площадь квартиры, м²', type: 'number', required: true, min: 0.01, group: 'apartment', colSpan: 2 },
    { key: 'areaKitchen', label: 'Кухня, м²', type: 'number', min: 0, group: 'apartment' },
    { key: 'floor', label: 'Этаж', type: 'integer', min: 0, group: 'apartment' },
    { key: 'floorsTotal', label: 'Этажей в доме', type: 'integer', min: 1, group: 'apartment' },
    { key: 'roomTypeId', label: 'Комнатность', type: 'select', refKey: 'room-types', group: 'apartment' },
    { key: 'finishingId', label: 'Отделка', type: 'select', refKey: 'finishings', group: 'apartment' },
    { key: 'buildingName', label: 'Корпус / секция', type: 'text', group: 'apartment' },
    { key: 'number', label: 'Номер квартиры', type: 'text', group: 'apartment' },
  ],
  ROOM: [
    { key: 'blockAddress', label: 'Адрес объекта', type: 'text', group: 'apartment', colSpan: 2 },
    { key: 'marketSegment', label: 'Тип рынка', type: 'select', options: marketSegmentOptions, group: 'apartment', colSpan: 2 },
    { key: 'areaTotal', label: 'Площадь комнаты, м²', type: 'number', required: true, min: 0.01, group: 'apartment', colSpan: 2 },
    { key: 'areaKitchen', label: 'Кухня (доля), м²', type: 'number', min: 0, group: 'apartment' },
    { key: 'floor', label: 'Этаж', type: 'integer', min: 0, group: 'apartment' },
    { key: 'floorsTotal', label: 'Этажей в доме', type: 'integer', min: 1, group: 'apartment' },
    { key: 'roomTypeId', label: 'Комнатность', type: 'select', refKey: 'room-types', group: 'apartment' },
    { key: 'finishingId', label: 'Отделка', type: 'select', refKey: 'finishings', group: 'apartment' },
    { key: 'buildingName', label: 'Корпус', type: 'text', group: 'apartment' },
    { key: 'number', label: 'Номер комнаты', type: 'text', group: 'apartment' },
  ],
  HOUSE: [
    { key: 'houseType', label: 'Тип дома', type: 'select', options: houseTypeOptions, group: 'house', colSpan: 2 },
    { key: 'material', label: 'Материал стен', type: 'select', options: materialOptions, group: 'house', colSpan: 2 },
    { key: 'areaTotal', label: 'Площадь дома, м²', type: 'number', required: true, min: 0.01, group: 'house' },
    { key: 'areaLand', label: 'Площадь участка, сот.', type: 'number', min: 0, group: 'house' },
    { key: 'floorsCount', label: 'Этажей', type: 'integer', min: 1, group: 'house' },
    { key: 'bedrooms', label: 'Спален', type: 'integer', min: 0, group: 'house' },
    { key: 'bathrooms', label: 'Санузлов', type: 'integer', min: 0, group: 'house' },
    { key: 'yearBuilt', label: 'Год постройки', type: 'integer', min: 1800, max: 2035, group: 'house' },
    { key: 'settlement', label: 'Населённый пункт', type: 'text', group: 'house', colSpan: 2 },
    { key: 'street', label: 'Улица', type: 'text', group: 'house' },
    { key: 'houseNumber', label: 'Дом', type: 'text', group: 'house' },
    { key: 'districtName', label: 'Район', type: 'text', group: 'house', colSpan: 2 },
    { key: 'description', label: 'Описание', type: 'textarea', group: 'house', colSpan: 2 },
    { key: 'hasGarage', label: 'Есть гараж', type: 'boolean', group: 'house' },
  ],
  DACHA: [
    { key: 'houseType', label: 'Тип постройки', type: 'select', options: houseTypeOptions, group: 'house', colSpan: 2 },
    { key: 'material', label: 'Материал', type: 'select', options: materialOptions, group: 'house', colSpan: 2 },
    { key: 'areaTotal', label: 'Площадь дачи, м²', type: 'number', required: true, min: 0.01, group: 'house' },
    { key: 'areaLand', label: 'Площадь участка, сот.', type: 'number', min: 0, group: 'house' },
    { key: 'floorsCount', label: 'Этажей', type: 'integer', min: 1, group: 'house' },
    { key: 'yearBuilt', label: 'Год постройки', type: 'integer', min: 1800, max: 2035, group: 'house' },
    { key: 'settlement', label: 'Населённый пункт', type: 'text', group: 'house', colSpan: 2 },
    { key: 'street', label: 'Улица', type: 'text', group: 'house' },
    { key: 'houseNumber', label: 'Дом', type: 'text', group: 'house' },
    { key: 'districtName', label: 'Район', type: 'text', group: 'house', colSpan: 2 },
    { key: 'description', label: 'Описание', type: 'textarea', group: 'house', colSpan: 2 },
    { key: 'hasGarage', label: 'Есть гараж', type: 'boolean', group: 'house' },
  ],
  LAND: [
    { key: 'areaSotki', label: 'Площадь участка, сот.', type: 'number', required: true, min: 0.01, group: 'land', colSpan: 2 },
    { key: 'landCategory', label: 'Категория земли', type: 'text', group: 'land', colSpan: 2 },
    { key: 'cadastralNumber', label: 'Кадастровый номер', type: 'text', group: 'land', colSpan: 2 },
    { key: 'hasCommunications', label: 'Коммуникации', type: 'boolean', group: 'land' },
  ],
  COMMERCIAL: [
    { key: 'commercialType', label: 'Тип помещения', type: 'select', options: commercialTypeOptions, group: 'commercial', colSpan: 2 },
    { key: 'area', label: 'Площадь, м²', type: 'number', required: true, min: 0.01, group: 'commercial', colSpan: 2 },
    { key: 'floor', label: 'Этаж', type: 'integer', group: 'commercial' },
    { key: 'hasSeparateEntrance', label: 'Отдельный вход', type: 'boolean', group: 'commercial' },
  ],
  PARKING: [
    { key: 'parkingType', label: 'Тип паркинга', type: 'select', options: parkingTypeOptions, group: 'parking', colSpan: 2 },
    { key: 'area', label: 'Площадь, м²', type: 'number', required: true, min: 0.01, group: 'parking', colSpan: 2 },
    { key: 'floor', label: 'Этаж / уровень', type: 'integer', group: 'parking' },
    { key: 'number', label: 'Номер места', type: 'text', group: 'parking' },
  ],
};

export const LISTING_WIZARD_MEDIA_LIMITS = {
  maxGallery: 24,
  maxFileSizeBytes: 15 * 1024 * 1024,
  allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
} as const;

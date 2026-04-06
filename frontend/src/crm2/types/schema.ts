export type EntityFieldUiType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'text'
  | 'relation';

export interface EntityFieldOptionDto {
  value: string;
  label: string;
}

export interface EntityFieldSchema {
  code: string;
  name: string;
  group: string | null;
  type: string;
  ui_type: EntityFieldUiType;
  is_required: boolean;
  is_filterable: boolean;
  is_searchable: boolean;
  sort_order: number;
  relation_target_type: string | null;
  relation_label_field: string | null;
  validation_min: number | null;
  validation_max: number | null;
  /** PCRE; client uses best-effort JS RegExp where possible. */
  validation_pattern: string | null;
  validation_min_length: number | null;
  validation_max_length: number | null;
  /** Allowed values (strings); same semantics as backend JSON array. */
  validation_enum: string[] | null;
  options: EntityFieldOptionDto[];
}

export interface EntityTypeSchema {
  code: string;
  name: string;
  icon: string | null;
  fields: EntityFieldSchema[];
}

/** Admin schema builder API (`/admin/entity-types`). */
export interface AdminEntityFieldSchema extends EntityFieldSchema {
  id: number;
}

export interface AdminEntityTypeSchema {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  fields: AdminEntityFieldSchema[];
}

export interface EntityRecordDto {
  id: number;
  type: string;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at?: string | null;
  values: Record<string, unknown>;
}

export interface EntityListResponse {
  data: EntityRecordDto[];
  meta: {
    per_page: number;
    has_more: boolean;
    next_cursor: string | null;
    count: number;
  };
}

export interface EntityHistoryItemDto {
  id: number;
  action: 'created' | 'updated' | 'deleted' | 'restored' | string;
  user_id: number | null;
  user?: { id: number; name: string; email: string } | null;
  created_at: string | null;
  diff: Record<string, unknown> | null;
}

export interface EntityHistoryCursorMeta {
  per_page: number;
  count: number;
  has_more: boolean;
  next_cursor: string | null;
}

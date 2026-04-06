import { useQuery } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';
import type { EntityFieldSchema, EntityTypeSchema } from '../types/schema';

function normalizeField(f: EntityFieldSchema): EntityFieldSchema {
  return {
    ...f,
    relation_label_field: f.relation_label_field ?? null,
    validation_min: f.validation_min ?? null,
    validation_max: f.validation_max ?? null,
    validation_pattern: f.validation_pattern ?? null,
    validation_min_length: f.validation_min_length ?? null,
    validation_max_length: f.validation_max_length ?? null,
    validation_enum: f.validation_enum ?? null,
  };
}

export function useEntityTypes() {
  return useQuery({
    queryKey: ['v2', 'entity-types'],
    queryFn: async () => {
      const res = await v2.get<{ data: EntityTypeSchema[] }>('/entity-types');
      return res.data.map(t => ({
        ...t,
        fields: t.fields.map(normalizeField),
      }));
    },
  });
}

export function useEntityType(typeCode: string | undefined, types: EntityTypeSchema[] | undefined) {
  if (!typeCode || !types) return undefined;
  return types.find(t => t.code === typeCode);
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';
import type { AdminEntityTypeSchema } from '../types/schema';

const key = ['v2', 'admin-entity-types'] as const;

export function useAdminEntityTypes() {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await v2.get<{ data: AdminEntityTypeSchema[] }>('/admin/entity-types');
      return res.data;
    },
  });
}

export function useAdminEntityTypeMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['v2', 'entity-types'] });
  };

  const createType = useMutation({
    mutationFn: (body: { code: string; name: string; icon?: string | null; is_active?: boolean; sort_order?: number }) =>
      v2.post<{ data: AdminEntityTypeSchema }>('/entity-types', body),
    onSuccess: invalidateAll,
  });

  const updateType = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<{ name: string; icon: string | null; is_active: boolean; sort_order: number }> }) =>
      v2.put<{ data: AdminEntityTypeSchema }>(`/entity-types/${id}`, body),
    onSuccess: invalidateAll,
  });

  const createField = useMutation({
    mutationFn: ({
      typeId,
      body,
    }: {
      typeId: number;
      body: Record<string, unknown>;
    }) => v2.post<{ data: AdminEntityTypeSchema['fields'][0] }>(`/entity-types/${typeId}/fields`, body),
    onSuccess: invalidateAll,
  });

  const updateField = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      v2.put<{ data: AdminEntityTypeSchema['fields'][0] }>(`/entity-fields/${id}`, body),
    onSuccess: invalidateAll,
  });

  const deleteField = useMutation({
    mutationFn: (id: number) => v2.delete<{ ok: boolean }>(`/entity-fields/${id}`),
    onSuccess: invalidateAll,
  });

  return { createType, updateType, createField, updateField, deleteField };
}

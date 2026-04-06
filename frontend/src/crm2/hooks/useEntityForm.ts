import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';
import type { EntityRecordDto } from '../types/schema';

export function useEntityRecord(type: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ['v2', 'entity', type, id],
    queryFn: () => v2.get<{ data: EntityRecordDto }>(`/entities/${type}/${id}`),
    enabled: !!type && !!id && id !== 'create',
  });
}

export function useEntityMutations(type: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['v2', 'entities', type] });
    qc.invalidateQueries({ queryKey: ['v2', 'entity', type] });
  };

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      v2.post<{ data: EntityRecordDto }>(`/entities/${type}`, body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      v2.put<{ data: EntityRecordDto }>(`/entities/${id}`, body),
    onSuccess: invalidate,
  });

  return { create, update };
}

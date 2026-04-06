import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';

export function useEntityBulkMutations(type: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['v2', 'entities', type] });
    qc.invalidateQueries({ queryKey: ['v2', 'entity', type] });
  };

  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => v2.post<{ ok: boolean }>('/entity-records/bulk-delete', { ids }),
    onSuccess: invalidate,
  });

  const bulkUpdate = useMutation({
    mutationFn: (args: { ids: number[]; values: Record<string, unknown> }) =>
      v2.patch<{ ok: boolean }>('/entity-records/bulk-update', args),
    onSuccess: invalidate,
  });

  const bulkRestore = useMutation({
    mutationFn: (ids: number[]) => v2.post<{ ok: boolean }>('/entity-records/bulk-restore', { ids }),
    onSuccess: invalidate,
  });

  return { bulkDelete, bulkUpdate, bulkRestore };
}

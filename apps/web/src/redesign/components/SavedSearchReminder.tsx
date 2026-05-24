import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { savedSearchParamsToCatalogUrl } from '@lg/shared';
import { cn } from '@/lib/utils';

type SavedSearchRow = {
  id: string;
  name: string;
  paramsJson: { params?: Record<string, string>; regionId?: number | null };
  updatedAt: string;
};

type Props = {
  className?: string;
};

export default function SavedSearchReminder({ className }: Props) {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['account', 'saved-searches', 'reminder'],
    queryFn: () => apiGet<SavedSearchRow[]>('/account/saved-searches'),
    enabled: isAuthenticated,
    staleTime: 120_000,
  });

  const latest = data?.[0];
  if (!latest) return null;

  const href = savedSearchParamsToCatalogUrl(latest.paramsJson);

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:border-primary/40 transition-colors',
        className,
      )}
    >
      <Bookmark className="w-4 h-4 text-primary shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Сохранённый поиск: <span className="font-medium">{latest.name}</span>
      </span>
    </Link>
  );
}

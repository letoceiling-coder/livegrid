import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { optionalAuthQueryOptions } from '@/shared/lib/safe-query';
import { cn } from '@/lib/utils';

export default function UserNotificationBell() {
  const { isAuthenticated } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ['account', 'notifications', 'unread'],
    queryFn: () => apiGet<number>('/account/notifications/unread-count'),
    ...optionalAuthQueryOptions({ isAuthenticated }),
    refetchInterval: (query) => (query.state.data != null ? 60_000 : false),
  });

  if (!isAuthenticated) return null;

  return (
    <Link
      to="/account/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
      title="Уведомления"
    >
      <Bell className="w-5 h-5" />
      {count > 0 ? (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
            'bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

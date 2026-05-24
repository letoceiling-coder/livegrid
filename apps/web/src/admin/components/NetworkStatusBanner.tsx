import { WifiOff } from 'lucide-react';
import { useCrmRefreshOptional } from '@/admin/context/CrmRefreshContext';

/** Offline banner — admin shell (uses CrmRefreshContext when available). */
export default function NetworkStatusBanner() {
  const crm = useCrmRefreshOptional();
  const online = crm?.online ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[200] flex items-center justify-center gap-2 bg-amber-600 text-white text-xs py-2 px-3"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>Нет подключения — данные могут быть устаревшими. Повторим при восстановлении сети.</span>
    </div>
  );
}

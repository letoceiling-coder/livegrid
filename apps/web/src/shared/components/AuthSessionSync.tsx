import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_LOGOUT_EVENT } from '@/lib/api';

/** Clears React Query cache when session is invalidated (Iter 89). */
export default function AuthSessionSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const onLogout = () => {
      qc.clear();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, [qc]);

  return null;
}

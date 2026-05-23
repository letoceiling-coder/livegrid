import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  CRM_IDLE_THRESHOLD_MS,
  CRM_MOBILE_MAX_WIDTH,
  resolvePollingProfile,
  type CrmPollingProfile,
} from '@/admin/lib/crm-polling-policy';
import {
  crmObsPollingProfile,
  crmObsVisibilityTransition,
} from '@/admin/lib/crm-observability';

type CrmRefreshContextValue = {
  profile: CrmPollingProfile;
  visible: boolean;
  focused: boolean;
  online: boolean;
  idle: boolean;
  opsCritical: boolean;
  /** Increments on tab restore / focus — trigger debounced refresh */
  refreshGeneration: number;
  bumpActivity: () => void;
  requestFocusRefresh: () => void;
};

const CrmRefreshContext = createContext<CrmRefreshContextValue | null>(null);

export function CrmRefreshProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true,
  );
  const [focused, setFocused] = useState(() =>
    typeof document !== 'undefined' ? document.hasFocus() : true,
  );
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [idle, setIdle] = useState(false);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [mobileViewport, setMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < CRM_MOBILE_MAX_WIDTH : false,
  );

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHidden = useRef(typeof document !== 'undefined' ? document.hidden : false);
  const skipNextFocusRefresh = useRef(false);

  const opsCritical = /\/admin\/(ops|requests)/.test(location.pathname);

  const bumpActivity = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), CRM_IDLE_THRESHOLD_MS);
  }, []);

  const requestFocusRefresh = useCallback(() => {
    setRefreshGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    bumpActivity();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [bumpActivity]);

  useEffect(() => {
    const onVis = () => {
      const v = !document.hidden;
      setVisible(v);
      crmObsVisibilityTransition(v ? 'visible' : 'hidden');
      if (v && wasHidden.current) {
        skipNextFocusRefresh.current = true;
        requestFocusRefresh();
        window.setTimeout(() => {
          skipNextFocusRefresh.current = false;
        }, 400);
      }
      wasHidden.current = document.hidden;
      if (v) bumpActivity();
    };
    const onFocus = () => {
      setFocused(true);
      if (!skipNextFocusRefresh.current) {
        requestFocusRefresh();
      }
      bumpActivity();
    };
    const onBlur = () => setFocused(false);
    const onOnline = () => {
      setOnline(true);
      requestFocusRefresh();
    };
    const onOffline = () => setOnline(false);
    const onActivity = () => bumpActivity();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [bumpActivity, requestFocusRefresh]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${CRM_MOBILE_MAX_WIDTH - 1}px)`);
    const apply = () => setMobileViewport(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const profile = useMemo(
    () => resolvePollingProfile({ visible, online, idle, opsCritical, mobileViewport }),
    [visible, online, idle, opsCritical, mobileViewport],
  );

  useEffect(() => {
    crmObsPollingProfile(profile);
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      visible,
      focused,
      online,
      idle,
      opsCritical,
      refreshGeneration,
      bumpActivity,
      requestFocusRefresh,
    }),
    [profile, visible, focused, online, idle, opsCritical, refreshGeneration, bumpActivity, requestFocusRefresh],
  );

  return <CrmRefreshContext.Provider value={value}>{children}</CrmRefreshContext.Provider>;
}

export function useCrmRefresh(): CrmRefreshContextValue {
  const ctx = useContext(CrmRefreshContext);
  if (!ctx) {
    throw new Error('useCrmRefresh must be used within CrmRefreshProvider');
  }
  return ctx;
}

/** Safe outside provider — returns null */
export function useCrmRefreshOptional(): CrmRefreshContextValue | null {
  return useContext(CrmRefreshContext);
}

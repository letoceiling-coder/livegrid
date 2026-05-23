/**
 * Centralized CRM polling profiles — single source of truth (Iter 34).
 * NO WebSockets — adaptive intervals only.
 */

export type CrmPollingProfile =
  | 'FOCUSED_ACTIVE'
  | 'FOCUSED_IDLE'
  | 'BACKGROUND_TAB'
  | 'MOBILE_BACKGROUND'
  | 'OPS_CRITICAL';

/** Query policy keys — map to consumer queries */
export type CrmPollPolicyKey =
  | 'unreadCount'
  | 'opsCenter'
  | 'requestQueue'
  | 'workload'
  | 'passive';

export type CrmPollIntervals = Record<CrmPollPolicyKey, number | false>;

/** Interval ms per profile × policy. `false` = suspended. */
export const CRM_POLLING_MATRIX: Record<CrmPollingProfile, CrmPollIntervals> = {
  FOCUSED_ACTIVE: {
    unreadCount: 12_000,
    opsCenter: 15_000,
    requestQueue: 15_000,
    workload: 30_000,
    passive: false,
  },
  FOCUSED_IDLE: {
    unreadCount: 30_000,
    opsCenter: 45_000,
    requestQueue: 30_000,
    workload: 60_000,
    passive: false,
  },
  BACKGROUND_TAB: {
    unreadCount: 120_000,
    opsCenter: 180_000,
    requestQueue: 120_000,
    workload: 180_000,
    passive: false,
  },
  MOBILE_BACKGROUND: {
    unreadCount: false,
    opsCenter: false,
    requestQueue: false,
    workload: false,
    passive: false,
  },
  OPS_CRITICAL: {
    unreadCount: 8_000,
    opsCenter: 10_000,
    requestQueue: 12_000,
    workload: 20_000,
    passive: false,
  },
};

export const CRM_IDLE_THRESHOLD_MS = 90_000;
export const CRM_FOCUS_REFRESH_DEBOUNCE_MS = 500;
export const CRM_FOCUS_REFRESH_MIN_GAP_MS = 2_000;
export const CRM_MOBILE_MAX_WIDTH = 768;

export function resolvePollingProfile(input: {
  visible: boolean;
  online: boolean;
  idle: boolean;
  opsCritical: boolean;
  mobileViewport: boolean;
}): CrmPollingProfile {
  if (!input.online) return 'MOBILE_BACKGROUND';
  if (!input.visible) {
    return input.mobileViewport ? 'MOBILE_BACKGROUND' : 'BACKGROUND_TAB';
  }
  if (input.opsCritical && !input.idle) return 'OPS_CRITICAL';
  if (input.idle) return 'FOCUSED_IDLE';
  return 'FOCUSED_ACTIVE';
}

export function getPollInterval(profile: CrmPollingProfile, key: CrmPollPolicyKey): number | false {
  return CRM_POLLING_MATRIX[profile][key];
}

/** Estimated savings vs fixed 30s baseline (DEV metric). */
export function estimatePollingSavingsPct(profile: CrmPollingProfile, key: CrmPollPolicyKey): number {
  const interval = getPollInterval(profile, key);
  if (interval === false) return 100;
  const baseline = 30_000;
  return Math.max(0, Math.round((1 - baseline / interval) * 100));
}

/**
 * DEV-only conversion metrics — no production overhead.
 * Enable: ?conversion_debug=1 (DEV builds only)
 */

import type { ConversionSurface } from '@/redesign/lib/conversion-cta';

export type ConversionSnapshot = {
  ctaClicks: number;
  phoneClicks: number;
  consultationOpens: number;
  formSubmits: number;
  formSuccesses: number;
  formErrors: number;
  favoriteToggles: number;
  shareActions: number;
  modalOpenLatencyMs: number;
  lastAction: string;
  lastSurface: ConversionSurface | '';
};

const empty = (): ConversionSnapshot => ({
  ctaClicks: 0,
  phoneClicks: 0,
  consultationOpens: 0,
  formSubmits: 0,
  formSuccesses: 0,
  formErrors: 0,
  favoriteToggles: 0,
  shareActions: 0,
  modalOpenLatencyMs: 0,
  lastAction: '',
  lastSurface: '',
});

let snapshot: ConversionSnapshot = empty();
const listeners = new Set<(s: ConversionSnapshot) => void>();

function emit(): void {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

export function isConversionDebugEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('conversion_debug') === '1'
  );
}

export function subscribeConversionStats(fn: (s: ConversionSnapshot) => void): () => void {
  if (!isConversionDebugEnabled()) return () => {};
  listeners.add(fn);
  fn({ ...snapshot });
  return () => listeners.delete(fn);
}

function track(partial: Partial<ConversionSnapshot>): void {
  if (!isConversionDebugEnabled()) return;
  snapshot = { ...snapshot, ...partial };
  emit();
}

export function conversionObsCtaClick(
  action: 'phone' | 'consultation' | 'viewing' | 'price' | 'details' | 'mortgage',
  surface: ConversionSurface,
): void {
  track({
    ctaClicks: snapshot.ctaClicks + 1,
    phoneClicks: action === 'phone' ? snapshot.phoneClicks + 1 : snapshot.phoneClicks,
    lastAction: action,
    lastSurface: surface,
  });
}

export function conversionObsConsultationOpen(surface: ConversionSurface, startedAt: number): void {
  track({
    consultationOpens: snapshot.consultationOpens + 1,
    modalOpenLatencyMs: performance.now() - startedAt,
    lastAction: 'consultation_open',
    lastSurface: surface,
  });
}

export function conversionObsFormSubmit(): void {
  track({ formSubmits: snapshot.formSubmits + 1, lastAction: 'form_submit' });
}

export function conversionObsFormSuccess(): void {
  track({ formSuccesses: snapshot.formSuccesses + 1, lastAction: 'form_success' });
}

export function conversionObsFormError(): void {
  track({ formErrors: snapshot.formErrors + 1, lastAction: 'form_error' });
}

export function conversionObsFavoriteToggle(): void {
  track({ favoriteToggles: snapshot.favoriteToggles + 1, lastAction: 'favorite_toggle' });
}

export function conversionObsShare(): void {
  track({ shareActions: snapshot.shareActions + 1, lastAction: 'share' });
}

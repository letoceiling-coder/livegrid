/** Shared validation for mandatory privacy consent on PII forms. */

export const PRIVACY_CONSENT_ERROR =
  'Подтвердите согласие с политикой конфиденциальности';

export function isPrivacyConsentAccepted(accepted: boolean): boolean {
  return accepted === true;
}

/** Returns error message when consent is missing, otherwise null. */
export function validatePrivacyConsent(accepted: boolean): string | null {
  return isPrivacyConsentAccepted(accepted) ? null : PRIVACY_CONSENT_ERROR;
}

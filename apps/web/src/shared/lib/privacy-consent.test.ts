import { describe, it, expect } from 'vitest';
import {
  PRIVACY_CONSENT_ERROR,
  isPrivacyConsentAccepted,
  validatePrivacyConsent,
} from '@/shared/lib/privacy-consent';

describe('privacy-consent', () => {
  it('requires explicit acceptance', () => {
    expect(isPrivacyConsentAccepted(false)).toBe(false);
    expect(isPrivacyConsentAccepted(true)).toBe(true);
  });

  it('returns validation error when consent missing', () => {
    expect(validatePrivacyConsent(false)).toBe(PRIVACY_CONSENT_ERROR);
    expect(validatePrivacyConsent(true)).toBeNull();
  });
});

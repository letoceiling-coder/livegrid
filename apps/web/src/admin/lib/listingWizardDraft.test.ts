import { describe, expect, it } from 'vitest';
import { applyKindDefaults, makeEmptyWizardDraft } from './listingWizardDraft.js';

describe('applyKindDefaults', () => {
  it('clears apartment params when switching to land', () => {
    const draft = makeEmptyWizardDraft();
    draft.kind = 'APARTMENT';
    draft.apartment.areaTotal = '99';
    const next = applyKindDefaults(draft, 'LAND');
    expect(next.kind).toBe('LAND');
    expect(next.apartment.areaTotal).toBe('');
    expect(next.land.areaSotki).toBe('');
  });

  it('preserves active group fields when switching room to apartment', () => {
    const draft = makeEmptyWizardDraft();
    draft.kind = 'ROOM';
    draft.apartment.areaTotal = '12';
    const next = applyKindDefaults(draft, 'APARTMENT');
    expect(next.apartment.areaTotal).toBe('12');
  });
});

import { describe, expect, it } from 'vitest';
import { resolveListingPublicContact } from './listing-contact.js';

describe('resolveListingPublicContact', () => {
  it('exposes agent slug for manual listings', () => {
    const contact = resolveListingPublicContact({
      dataSource: 'MANUAL',
      ownerUser: {
        id: 'u1',
        fullName: 'Олег Елкин',
        phone: '+79507100977',
        email: 'a@example.com',
        avatarUrl: null,
        agentProfile: { slug: 'oleg-elkin' },
      },
    });
    expect(contact.kind).toBe('agent');
    if (contact.kind === 'agent') {
      expect(contact.slug).toBe('oleg-elkin');
    }
  });

  it('returns agency contact for feed listings', () => {
    const contact = resolveListingPublicContact({
      dataSource: 'FEED',
      builder: { name: 'Застройщик', phone: '8800' },
    });
    expect(contact.kind).toBe('agency');
  });
});

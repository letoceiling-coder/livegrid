import type { DataSource } from '../enums/data-source.js';

export type ListingContactAgent = {
  kind: 'agent';
  userId: string;
  slug: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  showEmail: boolean;
  email: string | null;
};

export type ListingContactAgency = {
  kind: 'agency';
  label: string;
  phone: string | null;
  showEmail: boolean;
  email: string | null;
};

export type ListingPublicContact = ListingContactAgent | ListingContactAgency;

type ContactInput = {
  dataSource: DataSource | string;
  builder?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  ownerUser?: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    agentProfile?: { slug: string } | null;
  } | null;
  seller?: { fullName?: string | null; phone?: string | null; email?: string | null } | null;
};

/** Truth-safe public contact — FEED shows agency, MANUAL shows responsible agent. */
export function resolveListingPublicContact(
  listing: ContactInput,
  opts?: { authenticated?: boolean },
): ListingPublicContact {
  const authenticated = opts?.authenticated === true;

  if (listing.dataSource === 'MANUAL' && listing.ownerUser) {
    return {
      kind: 'agent',
      userId: listing.ownerUser.id,
      slug: listing.ownerUser.agentProfile?.slug?.trim() || null,
      fullName: listing.ownerUser.fullName ?? null,
      phone: listing.ownerUser.phone ?? null,
      avatarUrl: listing.ownerUser.avatarUrl ?? null,
      showEmail: authenticated,
      email: authenticated ? listing.ownerUser.email ?? null : null,
    };
  }

  const agencyPhone =
    listing.builder?.phone?.trim() ||
    listing.seller?.phone?.trim() ||
    null;
  const agencyEmail = listing.builder?.email?.trim() || null;

  return {
    kind: 'agency',
    label: listing.builder?.name?.trim() || 'Агентство',
    phone: agencyPhone,
    showEmail: authenticated,
    email: authenticated ? agencyEmail : null,
  };
}

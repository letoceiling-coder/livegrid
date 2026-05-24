import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { buildListingFingerprintKey, computeListingQualityScore, type ListingQualityInput } from '@lg/shared';

@Injectable()
export class TrustQualityService {
  hashFingerprint(key: string): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 32);
  }

  buildFingerprint(input: {
    title: string | null;
    address: string | null;
    price: number | null;
    regionId: number;
    kind: string;
    areaTotal: number | null;
  }): { key: string; hash: string } {
    const key = buildListingFingerprintKey(input);
    return { key, hash: this.hashFingerprint(key) };
  }

  scoreListing(input: ListingQualityInput) {
    return computeListingQualityScore(input);
  }

  countPhotos(
    listing: {
      apartment?: { planUrl?: string | null; finishingPhotoUrl?: string | null; extraPhotoUrls?: unknown } | null;
      house?: { photoUrl?: string | null; extraPhotoUrls?: unknown } | null;
      land?: { photoUrl?: string | null; extraPhotoUrls?: unknown } | null;
      commercial?: { photoUrl?: string | null; extraPhotoUrls?: unknown } | null;
      parking?: { photoUrl?: string | null; extraPhotoUrls?: unknown } | null;
    },
    mediaCount = 0,
  ): number {
    let count = mediaCount;
    const add = (u: unknown) => {
      if (typeof u === 'string' && u.trim()) count += 1;
    };
    const fromArr = (arr: unknown) => {
      if (Array.isArray(arr)) count += arr.filter((x) => typeof x === 'string' && x.trim()).length;
    };
    add(listing.apartment?.planUrl);
    add(listing.apartment?.finishingPhotoUrl);
    fromArr(listing.apartment?.extraPhotoUrls);
    add(listing.house?.photoUrl);
    fromArr(listing.house?.extraPhotoUrls);
    add(listing.land?.photoUrl);
    fromArr(listing.land?.extraPhotoUrls);
    add(listing.commercial?.photoUrl);
    fromArr(listing.commercial?.extraPhotoUrls);
    add(listing.parking?.photoUrl);
    fromArr(listing.parking?.extraPhotoUrls);
    return count;
  }
}

/**
 * Adaptive cover composition for complex hero / gallery frames.
 * Positions are derived from intrinsic image size vs container box — not fixed offsets.
 */

/** Max vertical crop bias when container crops top/bottom (architectural exteriors). */
const MAX_VERTICAL_BIAS_PCT = 22;

/** Scale factor: how strongly aspect mismatch shifts focal point. */
const CROP_BIAS_SCALE = 28;

/** Portrait images: keep symmetric crop. */
const PORTRAIT_ASPECT_THRESHOLD = 0.82;

/**
 * Given image and container dimensions, compute CSS object-position for object-fit: cover.
 * When the container is wider than the image aspect needs, cover trims top/bottom;
 * focal shifts slightly downward (building mass below sky) proportional to crop severity.
 */
export function computeArchitecturalCoverPosition(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
): string {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return 'center center';
  }

  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;

  if (imageAspect < PORTRAIT_ASPECT_THRESHOLD) {
    return 'center center';
  }

  if (imageAspect >= containerAspect) {
    return 'center center';
  }

  const cropSeverity = containerAspect / imageAspect - 1;
  const yPercent = 50 + Math.min(MAX_VERTICAL_BIAS_PCT, cropSeverity * CROP_BIAS_SCALE);
  return `center ${yPercent}%`;
}

/** Very tall images: contain avoids destructive vertical crop. */
export function shouldUseContainForHero(imageWidth: number, imageHeight: number): boolean {
  if (imageWidth <= 0 || imageHeight <= 0) return false;
  return imageWidth / imageHeight < PORTRAIT_ASPECT_THRESHOLD;
}

/** Responsive gallery viewport — wider on large screens reduces empty sky. */
export const COMPLEX_GALLERY_VIEWPORT_CLASS =
  'relative w-full overflow-hidden bg-muted ' +
  'aspect-[5/4] max-h-[min(340px,50vh)] ' +
  'sm:aspect-[16/9] sm:max-h-[min(360px,46vh)] ' +
  'lg:aspect-[2/1] lg:max-h-[min(380px,40vh)]';

export const COMPLEX_GALLERY_THUMB_CLASS =
  'relative shrink-0 overflow-hidden rounded-lg aspect-[4/3]';

export const COMPLEX_GALLERY_THUMB_SIZE_CLASS = 'h-14 w-[4.75rem] sm:h-16 sm:w-24';

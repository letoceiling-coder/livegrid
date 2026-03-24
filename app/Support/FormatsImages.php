<?php

namespace App\Support;

/**
 * Provides formatImage() and formatImages() helpers for consistent,
 * full-URL image normalization across API resources and services.
 *
 * Rule:
 *   - null / empty string → null
 *   - starts with "http"  → returned as-is (already absolute)
 *   - otherwise           → APP_URL + "/storage/" + trimmed path
 */
trait FormatsImages
{
    protected function formatImage(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return rtrim(config('app.url'), '/') . '/storage/' . ltrim($path, '/');
    }

    /**
     * Normalize an array of image paths (handles both string[] and mixed[]).
     * Accepts: array of strings, JSON string, or null.
     *
     * @param  array|string|null $images
     * @return string[]
     */
    protected function formatImages(array|string|null $images): array
    {
        if (is_string($images)) {
            $images = json_decode($images, true) ?? [];
        }

        if (empty($images)) {
            return [];
        }

        return array_values(
            array_filter(
                array_map(fn($img) => $this->formatImage(is_string($img) ? $img : ($img['url'] ?? $img['path'] ?? null)), $images)
            )
        );
    }
}

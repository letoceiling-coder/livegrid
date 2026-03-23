<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Versioned cache invalidation.
 *
 * Instead of enumerating dynamic cache keys (which is impossible with the file
 * driver), we maintain monotonic version counters. Every cache key in
 * SearchService and MapController embeds the current version. Incrementing the
 * version makes all previous keys "invisible" — they expire naturally.
 *
 * Usage:
 *   CacheInvalidator::complexSearch();   // after complex / apartment CRUD
 *   CacheInvalidator::references();      // after builder / district CRUD
 *   CacheInvalidator::all();             // after bulk import / sync
 */
class CacheInvalidator
{
    // ─── Version keys ────────────────────────────────────────────────────────

    public const VER_SEARCH = 'cache_version:search';
    public const VER_MAP    = 'cache_version:map';

    // ─── Reference keys (enumerable, so we forget them directly) ─────────────

    private const REFERENCE_KEYS = [
        'references:districts',
        'references:subways',
        'references:builders',
        'references:finishings',
    ];

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Invalidate search + map caches (use after complex or apartment changes).
     */
    public static function complexSearch(): void
    {
        self::bumpVersion(self::VER_SEARCH);
        self::bumpVersion(self::VER_MAP);
        Log::debug('Cache invalidated: complexSearch');
    }

    /**
     * Invalidate reference data caches (use after builder / district changes).
     */
    public static function references(): void
    {
        foreach (self::REFERENCE_KEYS as $key) {
            Cache::forget($key);
        }
        Log::debug('Cache invalidated: references');
    }

    /**
     * Invalidate everything (use after full import / sync).
     */
    public static function all(): void
    {
        self::bumpVersion(self::VER_SEARCH);
        self::bumpVersion(self::VER_MAP);
        foreach (self::REFERENCE_KEYS as $key) {
            Cache::forget($key);
        }
        Log::debug('Cache invalidated: all');
    }

    // ─── Version helpers ──────────────────────────────────────────────────────

    public static function searchVersion(): int
    {
        return (int) Cache::get(self::VER_SEARCH, 1);
    }

    public static function mapVersion(): int
    {
        return (int) Cache::get(self::VER_MAP, 1);
    }

    private static function bumpVersion(string $key): void
    {
        if (Cache::has($key)) {
            Cache::increment($key);
        } else {
            Cache::forever($key, 2);
        }
    }
}

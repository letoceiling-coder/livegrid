<?php

namespace App\Listeners;

use App\Events\ComplexSearchNeedsSync;
use App\Jobs\SyncComplexesSearchJob;
use App\Services\CacheInvalidator;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Reacts to ComplexSearchNeedsSync events by:
 *  1. Doing targeted (partial) cache invalidation based on what changed
 *  2. Dispatching the async sync job (deduplication handled by ShouldBeUnique)
 *
 * This listener itself runs synchronously so cache invalidation is
 * immediate — the sync job runs asynchronously in the background.
 */
class DispatchComplexSearchSync
{
    // ─── Field groups for partial invalidation decisions ─────────────────────

    /** Changes to these fields only affect map pins (coordinates). */
    private const MAP_FIELDS = ['lat', 'lng'];

    /** Changes to these fields only affect reference dropdowns. */
    private const REF_FIELDS = ['builder_id', 'district_id'];

    /** Changes to these fields affect search aggregates (price, rooms, etc.). */
    private const SEARCH_FIELDS = [
        'name', 'slug', 'status', 'deadline', 'description',
        'price', 'rooms_count', 'area_total', 'floor', 'finishing_id',
    ];

    public function handle(ComplexSearchNeedsSync $event): void
    {
        $this->invalidateCaches($event);
        SyncComplexesSearchJob::dispatch();
    }

    private function invalidateCaches(ComplexSearchNeedsSync $event): void
    {
        $changed = $event->changedFields;

        // Bulk / feed operations → invalidate everything
        if (empty($changed) || in_array($event->reason, ['bulk_operation', 'feed_import', 'complex_deleted'])) {
            CacheInvalidator::all();
            return;
        }

        $bumpSearch = false;
        $bumpMap    = false;
        $bumpRefs   = false;

        foreach ($changed as $field) {
            if (in_array($field, self::MAP_FIELDS))    $bumpMap    = true;
            if (in_array($field, self::REF_FIELDS))    $bumpRefs   = true;
            if (in_array($field, self::SEARCH_FIELDS)) $bumpSearch = true;
        }

        // Coordinate changes → map only (search doesn't filter by lat/lng in listings)
        // Availability changes → also map (available_apartments count on pins)
        if (in_array($event->reason, ['apartment_changed'])) {
            $bumpSearch = true;
            $bumpMap    = true; // available_apartments count changes on map pins
        }

        if ($bumpSearch) CacheInvalidator::bumpSearch();
        if ($bumpMap)    CacheInvalidator::bumpMap();
        if ($bumpRefs)   CacheInvalidator::references();
    }
}

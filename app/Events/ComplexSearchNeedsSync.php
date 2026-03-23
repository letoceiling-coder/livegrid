<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired whenever the complexes_search index may be stale.
 * The $reason and $context fields allow listeners to make
 * smarter decisions about WHICH caches to invalidate.
 */
class ComplexSearchNeedsSync
{
    use Dispatchable, SerializesModels;

    public function __construct(
        /** What triggered the sync: 'complex_created', 'complex_updated',
         *  'complex_deleted', 'apartment_changed', 'bulk_operation', 'feed_import' */
        public readonly string  $reason,

        /** UUID of the affected complex, if known. Null on bulk/feed operations. */
        public readonly ?string $complexId = null,

        /** Which fields were changed (for partial invalidation decisions). */
        public readonly array   $changedFields = [],
    ) {}
}

<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Archive service - marks apartments as inactive based on last_seen_at
 */
class ArchiveService
{
    /**
     * Archive apartments that were not seen in the current import
     * Only archives if import was completed successfully
     *
     * @param Carbon $importStartedAt Import start time
     * @param int|null $sourceId Optional: archive only for specific source
     * @return int Number of archived apartments
     */
    public function archive(Carbon $importStartedAt, ?int $sourceId = null): int
    {
        $query = DB::table('apartments')
            ->where('is_active', true)
            ->where(function ($q) use ($importStartedAt) {
                $q->where('last_seen_at', '<', $importStartedAt)
                  ->orWhereNull('last_seen_at');
            });

        if ($sourceId !== null) {
            $query->where('source_id', $sourceId);
        }

        $affected = $query->update([
            'is_active' => false,
            'updated_at' => now(),
        ]);

        if ($affected > 0) {
            Log::info("Archived {$affected} apartments", [
                'import_started_at' => $importStartedAt->toDateTimeString(),
                'source_id' => $sourceId,
            ]);
        }

        return $affected;
    }

    /**
     * Reactivate apartments that were archived but are now in the feed
     *
     * @param array $externalIds Array of external_ids that are active
     * @param int $sourceId Source ID
     * @return int Number of reactivated apartments
     */
    public function reactivate(array $externalIds, int $sourceId): int
    {
        if (empty($externalIds)) {
            return 0;
        }

        $affected = DB::table('apartments')
            ->where('source_id', $sourceId)
            ->whereIn('external_id', $externalIds)
            ->where('is_active', false)
            ->update([
                'is_active' => true,
                'updated_at' => now(),
            ]);

        return $affected;
    }
}

<?php

namespace App\Services\Catalog\Import;

use App\Models\Catalog\Apartment;
use Illuminate\Support\Carbon;

class ArchiveService
{
    /**
     * Archive apartments that were not seen in the current import
     *
     * @param Carbon $importStartTime
     * @return int Number of archived apartments
     */
    public function archive(Carbon $importStartTime): int
    {
        return Apartment::where('last_seen_at', '<', $importStartTime)
            ->orWhereNull('last_seen_at')
            ->update([
                'is_active' => false,
            ]);
    }
}

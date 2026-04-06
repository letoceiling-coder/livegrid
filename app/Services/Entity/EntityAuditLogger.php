<?php

namespace App\Services\Entity;

use App\Models\Entity\EntityChangeLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Persists entity CRUD events for compliance / debugging.
 */
final class EntityAuditLogger
{
    private const WINDOW_SECONDS = 60;
    private const MAX_EVENTS_PER_WINDOW = 30;

    /**
     * @param  array<string, mixed>|null  $diff
     */
    public function write(
        string $entityTypeCode,
        ?int $entityRecordId,
        string $action,
        ?array $diff,
        ?int $userId,
    ): void {
        try {
            if ($entityRecordId !== null) {
                $cutoff = Carbon::now()->subSeconds(self::WINDOW_SECONDS);
                $count = EntityChangeLog::query()
                    ->where('entity_type_code', $entityTypeCode)
                    ->where('entity_record_id', $entityRecordId)
                    ->when($userId !== null, fn($q) => $q->where('user_id', $userId))
                    ->where('created_at', '>=', $cutoff)
                    ->count();

                if ($count >= self::MAX_EVENTS_PER_WINDOW) {
                    // Log abuse once per window (best-effort).
                    Log::warning('entity audit rate limit exceeded', [
                        'type' => $entityTypeCode,
                        'record_id' => $entityRecordId,
                        'user_id' => $userId,
                        'count' => $count,
                        'window_s' => self::WINDOW_SECONDS,
                    ]);

                    EntityChangeLog::create([
                        'entity_record_id' => $entityRecordId,
                        'entity_type_code' => $entityTypeCode,
                        'action'           => 'abuse',
                        'user_id'          => $userId,
                        'diff'             => [
                            'count' => $count,
                            'window_s' => self::WINDOW_SECONDS,
                            'blocked_action' => $action,
                        ],
                    ]);

                    return;
                }
            }

            EntityChangeLog::create([
                'entity_record_id' => $entityRecordId,
                'entity_type_code' => $entityTypeCode,
                'action'           => $action,
                'user_id'          => $userId,
                'diff'             => $diff,
            ]);
        } catch (\Throwable $e) {
            Log::error('entity_change_log write failed', [
                'type'   => $entityTypeCode,
                'record' => $entityRecordId,
                'action' => $action,
                'error'  => $e->getMessage(),
            ]);
        }
    }
}

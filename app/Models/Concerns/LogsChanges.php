<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Automatically logs field-level changes to apartment_changes table.
 * Usage: add `use LogsChanges;` to any model.
 */
trait LogsChanges
{
    /**
     * Fields to exclude from change logging (noisy / irrelevant for audit).
     */
    protected array $logExcludeFields = [
        'updated_at', 'last_seen_at', 'created_at',
    ];

    public static function bootLogsChanges(): void
    {
        static::updating(function (self $model) {
            $model->recordChanges();
        });
    }

    protected function recordChanges(): void
    {
        $dirty  = $this->getDirty();
        $userId = Auth::id();
        $source = app()->runningInConsole() ? 'feed' : 'manual';
        $now    = now();

        $rows = [];
        foreach ($dirty as $field => $newValue) {
            if (in_array($field, $this->logExcludeFields, true)) {
                continue;
            }
            $rows[] = [
                'apartment_id' => $this->getKey(),
                'user_id'      => $userId,
                'field'        => $field,
                'old_value'    => (string) ($this->getOriginal($field) ?? ''),
                'new_value'    => (string) ($newValue ?? ''),
                'source'       => $source,
                'created_at'   => $now,
            ];
        }

        if (!empty($rows)) {
            DB::table('apartment_changes')->insert($rows);
        }
    }
}

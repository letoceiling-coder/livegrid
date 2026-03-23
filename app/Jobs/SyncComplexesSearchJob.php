<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Rebuilds the complexes_search index after CRM mutations.
 *
 * ShouldBeUnique guarantees at most ONE instance lives in the queue at any
 * time. When a second dispatch arrives while the first is still pending,
 * Laravel silently drops it. This prevents queue flooding on rapid CRUD
 * bursts (e.g. bulk apartment status changes).
 *
 * Lock is released the moment the job STARTS processing (not on finish),
 * so a new sync can be enqueued while the current one is running — ensuring
 * no mutation is ever missed.
 */
class SyncComplexesSearchJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries     = 3;
    public int $timeout   = 300;  // 5-minute hard limit
    public int $uniqueFor = 310;  // Lock TTL — slightly > timeout to handle stuck workers

    /** Single unique slot: only one sync job may be queued at a time. */
    public function uniqueId(): string
    {
        return 'complexes-search-sync';
    }

    public function handle(): void
    {
        Log::info('SyncComplexesSearchJob: starting');
        $exitCode = Artisan::call('complexes:sync-search');
        Log::info('SyncComplexesSearchJob: done', ['exit_code' => $exitCode]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SyncComplexesSearchJob: failed permanently', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    }
}

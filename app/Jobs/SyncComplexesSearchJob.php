<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Dispatched after CRM CRUD mutations that affect the search index
 * (complex create/update/delete, apartment create/bulk assign, etc.).
 *
 * Runs on the 'default' queue. Falls back to synchronous execution
 * when no queue worker is running (QUEUE_CONNECTION=sync).
 */
class SyncComplexesSearchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300; // 5 minutes max

    public function handle(): void
    {
        Log::info('SyncComplexesSearchJob: starting');
        Artisan::call('complexes:sync-search');
        Log::info('SyncComplexesSearchJob: done');
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SyncComplexesSearchJob: failed', ['error' => $e->getMessage()]);
    }
}

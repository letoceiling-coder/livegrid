<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Services\CacheInvalidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CrmMonitoringController extends Controller
{
    /**
     * System health and monitoring dashboard data.
     *
     * Returns real-time metrics for:
     *  - Queue health (pending / failed jobs, worker status)
     *  - Search index integrity (complexes_search vs blocks count)
     *  - Database record counts
     *  - Cache version state
     *  - Recent sync activity
     */
    public function index(): JsonResponse
    {
        $startTime = microtime(true);

        // ── Queue ─────────────────────────────────────────────────────────────
        $pendingJobs = $this->safeCount(fn () =>
            DB::table('jobs')->count()
        );
        $processingJobs = $this->safeCount(fn () =>
            DB::table('jobs')->where('reserved_at', '!=', null)->count()
        );
        $failedJobs = $this->safeCount(fn () =>
            DB::table('failed_jobs')->count()
        );
        $recentFailed = $this->safeQuery(fn () =>
            DB::table('failed_jobs')
                ->select('id', 'queue', 'failed_at', 'exception')
                ->orderByDesc('failed_at')
                ->limit(5)
                ->get()
                ->map(fn ($j) => [
                    'id'         => $j->id,
                    'queue'      => $j->queue,
                    'failed_at'  => $j->failed_at,
                    'exception'  => substr($j->exception, 0, 200),
                ])
                ->toArray()
        );

        // ── Search index ──────────────────────────────────────────────────────
        $totalBlocks     = $this->safeCount(fn () => DB::table('blocks')->count());
        $totalIndexed    = $this->safeCount(fn () => DB::table('complexes_search')->count());
        $lastSyncedAt    = $this->safeQuery(fn () =>
            DB::table('complexes_search')->max('updated_at')
        );
        $indexCoverage   = $totalBlocks > 0
            ? round(($totalIndexed / $totalBlocks) * 100, 1)
            : 0;

        // ── Database ──────────────────────────────────────────────────────────
        $totalApartments  = $this->safeCount(fn () => DB::table('apartments')->where('is_active', 1)->count());
        $availableApts    = $this->safeCount(fn () =>
            DB::table('apartments')
                ->where('is_active', 1)
                ->whereIn('status', ['available', 'reserved'])
                ->count()
        );
        $totalBuilders    = $this->safeCount(fn () => DB::table('builders')->count());
        $totalDistricts   = $this->safeCount(fn () => DB::table('regions')->count());

        // ── Cache ─────────────────────────────────────────────────────────────
        $searchVer = CacheInvalidator::searchVersion();
        $mapVer    = CacheInvalidator::mapVersion();

        // ── Self-timing ───────────────────────────────────────────────────────
        $monitoringMs = round((microtime(true) - $startTime) * 1000, 1);

        return response()->json([
            'queue' => [
                'pending'    => $pendingJobs,
                'processing' => $processingJobs,
                'failed'     => $failedJobs,
                'recent_failures' => $recentFailed,
                'status'     => $failedJobs > 0 ? 'warning' : ($pendingJobs > 10 ? 'busy' : 'ok'),
            ],
            'search_index' => [
                'total_blocks'    => $totalBlocks,
                'total_indexed'   => $totalIndexed,
                'coverage_pct'    => $indexCoverage,
                'last_synced_at'  => $lastSyncedAt,
                'status'          => $indexCoverage >= 99 ? 'ok' : ($indexCoverage >= 90 ? 'warning' : 'critical'),
            ],
            'database' => [
                'complexes'        => $totalBlocks,
                'apartments_active'  => $totalApartments,
                'apartments_available' => $availableApts,
                'builders'          => $totalBuilders,
                'districts'         => $totalDistricts,
            ],
            'cache' => [
                'search_version' => $searchVer,
                'map_version'    => $mapVer,
            ],
            'monitoring_ms' => $monitoringMs,
            'generated_at'  => now()->toIso8601String(),
        ]);
    }

    private function safeCount(callable $fn): int
    {
        try {
            return (int) $fn();
        } catch (\Throwable) {
            return -1;
        }
    }

    private function safeQuery(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return null;
        }
    }
}

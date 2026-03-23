<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Complex;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CrmFeedController extends Controller
{
    private const LOCK_KEY   = 'crm_feed_running';
    private const STATUS_KEY = 'crm_feed_status';

    public function status(): JsonResponse
    {
        $running = Cache::get(self::LOCK_KEY, false);
        $status  = Cache::get(self::STATUS_KEY, [
            'last_run'     => null,
            'result'       => null,
            'complexes'    => Complex::count(),
            'apartments'   => Apartment::where('is_active', 1)->count(),
        ]);

        return response()->json([
            'running' => $running,
            'status'  => $status,
        ]);
    }

    public function runDownload(): JsonResponse
    {
        if (Cache::get(self::LOCK_KEY)) {
            return response()->json(['message' => 'Импорт уже выполняется.'], 409);
        }

        Cache::put(self::LOCK_KEY, true, 600);

        try {
            $exitCode = Artisan::call('feed:download');

            $output = Artisan::output();
            $result = [
                'last_run'   => now()->toISOString(),
                'result'     => $exitCode === 0 ? 'success' : 'error',
                'output'     => substr($output, 0, 2000),
                'complexes'  => Complex::count(),
                'apartments' => Apartment::where('is_active', 1)->count(),
            ];

            Cache::put(self::STATUS_KEY, $result, 86400);
        } catch (\Throwable $e) {
            Log::error('CRM feed download error', ['error' => $e->getMessage()]);
            $result = [
                'last_run' => now()->toISOString(),
                'result'   => 'error',
                'output'   => $e->getMessage(),
            ];
            Cache::put(self::STATUS_KEY, $result, 86400);
        } finally {
            Cache::forget(self::LOCK_KEY);
        }

        return response()->json([
            'message' => 'Загрузка фида завершена.',
            'status'  => $result,
        ]);
    }

    public function runSync(): JsonResponse
    {
        if (Cache::get(self::LOCK_KEY)) {
            return response()->json(['message' => 'Импорт уже выполняется.'], 409);
        }

        Cache::put(self::LOCK_KEY, true, 600);

        try {
            $exitCode = Artisan::call('complexes:sync-search');
            $output   = Artisan::output();

            $result = [
                'last_run'   => now()->toISOString(),
                'result'     => $exitCode === 0 ? 'success' : 'error',
                'output'     => substr($output, 0, 2000),
                'complexes'  => Complex::count(),
                'apartments' => Apartment::where('is_active', 1)->count(),
            ];

            Cache::put(self::STATUS_KEY, $result, 86400);
        } catch (\Throwable $e) {
            Log::error('CRM sync error', ['error' => $e->getMessage()]);
            $result = [
                'last_run' => now()->toISOString(),
                'result'   => 'error',
                'output'   => $e->getMessage(),
            ];
            Cache::put(self::STATUS_KEY, $result, 86400);
        } finally {
            Cache::forget(self::LOCK_KEY);
        }

        return response()->json([
            'message' => 'Синхронизация завершена.',
            'status'  => $result,
        ]);
    }
}

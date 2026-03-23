<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\ComplexController;
use App\Http\Controllers\Api\V1\ApartmentController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\SearchComplexesController;
use App\Http\Controllers\Api\Crm\CrmAuthController;
use App\Http\Controllers\Api\Crm\CrmDashboardController;
use App\Http\Controllers\Api\Crm\CrmComplexController;
use App\Http\Controllers\Api\Crm\CrmApartmentController;
use App\Http\Controllers\Api\Crm\CrmBuilderController;
use App\Http\Controllers\Api\Crm\CrmDistrictController;
use App\Http\Controllers\Api\Crm\CrmFeedController;
use App\Http\Controllers\Api\Crm\CrmMonitoringController;
use App\Models\Catalog\Building;
use App\Models\Catalog\Finishing;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ── Public API v1 ────────────────────────────────────────────────────────────
// Global throttle:api (300 req/min per IP) is applied by the api middleware group
Route::prefix('v1')->group(function () {
    Route::get('/complexes', [ComplexController::class, 'index']);
    Route::get('/complexes/{slug}', [ComplexController::class, 'show']);
    Route::get('/complexes/{slug}/apartments', [ComplexController::class, 'apartments']);
    Route::get('/apartments', [ApartmentController::class, 'index']);
    Route::get('/map/complexes', [MapController::class, 'complexes']);
    Route::get('/search/complexes', [SearchComplexesController::class, 'index']);
    Route::get('/filters', [ReferenceController::class, 'filters']);

    Route::get('/health', function () {
        return response()->json(['status' => 'ok', 'timestamp' => now()]);
    });

    // ── CRM Auth (public) ────────────────────────────────────────────────────
    Route::prefix('crm/auth')->group(function () {
        Route::post('/login', [CrmAuthController::class, 'login']);
    });

    // ── CRM Protected ────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'crm.admin'])->prefix('crm')->group(function () {
        Route::get('/auth/me', [CrmAuthController::class, 'me']);
        Route::post('/auth/logout', [CrmAuthController::class, 'logout']);

        Route::get('/dashboard', [CrmDashboardController::class, 'index']);

        Route::apiResource('complexes', CrmComplexController::class);
        // Extra apartment routes must be declared BEFORE apiResource to avoid {id} collision
        Route::post('/apartments/bulk',          [CrmApartmentController::class, 'bulk']);
        Route::get('/apartments-deleted',        [CrmApartmentController::class, 'trashed']);
        Route::apiResource('apartments', CrmApartmentController::class);
        Route::post('/apartments/{id}/restore',  [CrmApartmentController::class, 'restore']);
        Route::get('/apartments/{id}/history',   [CrmApartmentController::class, 'history']);
        Route::post('/apartments/{id}/lock',     [CrmApartmentController::class, 'lock']);
        Route::post('/apartments/{id}/unlock',   [CrmApartmentController::class, 'unlock']);

        Route::apiResource('builders', CrmBuilderController::class);
        Route::apiResource('districts', CrmDistrictController::class);

        Route::get('/monitoring', [CrmMonitoringController::class, 'index']);

        Route::get('/feed/status', [CrmFeedController::class, 'status']);
        Route::post('/feed/download', [CrmFeedController::class, 'runDownload']);
        Route::post('/feed/sync', [CrmFeedController::class, 'runSync']);

        // Reference helpers for forms
        Route::get('/finishings-list', function () {
            $finishings = Finishing::orderBy('name')->get()
                ->map(fn($f) => ['id' => $f->id, 'name' => $f->name]);
            return response()->json(['data' => $finishings]);
        });

        Route::get('/complexes/{id}/buildings', function (string $id) {
            $buildings = Building::where('block_id', $id)->orderBy('name')->get()
                ->map(fn($b) => ['id' => $b->id, 'name' => $b->name]);
            return response()->json(['data' => $buildings]);
        });
    });
});

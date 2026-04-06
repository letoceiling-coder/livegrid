<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\ComplexController;
use App\Http\Controllers\Api\V1\ApartmentController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\SearchComplexesController;
use App\Http\Controllers\Api\V1\SuggestController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V2\EntityController;
use App\Http\Controllers\Api\V2\EntitySchemaController;
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
    Route::get('/apartments/{id}', [ApartmentController::class, 'show']);
    Route::get('/map/complexes', [MapController::class, 'complexes']);
    Route::get('/search/complexes', [SearchComplexesController::class, 'index']);
    Route::get('/search/suggest',   [SuggestController::class, 'index']);
    Route::get('/filters', [ReferenceController::class, 'filters']);

    Route::prefix('home')->group(function () {
        Route::get('/blocks', [HomeController::class, 'blocks']);
        Route::get('/offers', [HomeController::class, 'offers']);
        Route::get('/news', [HomeController::class, 'news']);
    });

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

// ── API v2 — Entity System ────────────────────────────────────────────────────
Route::prefix('v2')->middleware(['auth:sanctum', 'crm.admin'])->group(function () {
    Route::get('/admin/entity-types', [EntitySchemaController::class, 'index']);
    Route::post('/entity-types', [EntitySchemaController::class, 'storeType']);
    Route::put('/entity-types/{entityType}', [EntitySchemaController::class, 'updateType']);
    Route::post('/entity-types/{entityType}/fields', [EntitySchemaController::class, 'storeField']);
    Route::put('/entity-fields/{entityField}', [EntitySchemaController::class, 'updateField']);
    Route::delete('/entity-fields/{entityField}', [EntitySchemaController::class, 'destroyField']);

    Route::get('/entity-types',         [EntityController::class, 'types']);
    Route::get('/entities/{type}',      [EntityController::class, 'index']);
    Route::post('/entities/{type}',     [EntityController::class, 'store']);
    Route::get('/entities/{type}/{id}', [EntityController::class, 'show']);
    Route::get('/entities/{type}/{id}/history', [EntityController::class, 'history']);
    Route::get('/entities/{type}/{id}/history/export', [EntityController::class, 'historyExport']);
    Route::put('/entities/{id}',        [EntityController::class, 'update']);
    Route::delete('/entity-records/{id}', [EntityController::class, 'destroy']);
    Route::post('/entity-records/{id}/restore', [EntityController::class, 'restore']);
    Route::post('/entity-records/bulk-delete', [EntityController::class, 'bulkDestroy']);
    Route::post('/entity-records/bulk-restore', [EntityController::class, 'bulkRestore']);
    Route::patch('/entity-records/bulk-update', [EntityController::class, 'bulkUpdate']);
});

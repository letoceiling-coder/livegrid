<?php

use App\Http\Controllers\Api\Crm\CrmApartmentController;
use App\Http\Controllers\Api\Crm\CrmAuthController;
use App\Http\Controllers\Api\Crm\CrmBuilderController;
use App\Http\Controllers\Api\Crm\CrmComplexController;
use App\Http\Controllers\Api\Crm\CrmDashboardController;
use App\Http\Controllers\Api\Crm\CrmDistrictController;
use App\Http\Controllers\Api\Crm\CrmFeedController;
use App\Http\Controllers\Api\Crm\CrmMonitoringController;
use App\Http\Controllers\Api\Crm\CrmLeadRequestController;
use App\Http\Controllers\Api\Crm\CrmRoleController;
use App\Http\Controllers\Api\Crm\CrmSettingsController;
use App\Http\Controllers\Api\Crm\CrmUserController;
use App\Http\Controllers\Api\V1\ApartmentController;
use App\Http\Controllers\Api\V1\ComplexController;
use App\Http\Controllers\Api\V1\ContactsController;
use App\Http\Controllers\Api\V1\FavoritesController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\RequestController;
use App\Http\Controllers\Api\V1\SearchComplexesController;
use App\Http\Controllers\Api\V1\SearchCountController;
use App\Http\Controllers\Api\V1\SuggestController;
use App\Http\Controllers\Api\V1\TelegramAuthController;
use App\Http\Controllers\Api\V2\EntityController;
use App\Http\Controllers\Api\V2\EntitySchemaController;
use App\Models\Catalog\Building;
use App\Models\Catalog\Finishing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ── Telegram Auth (public exchange + protected code generation) ─────────────
Route::post('/auth/telegram', [TelegramAuthController::class, 'exchangeCode']);
Route::post('/auth/telegram/code', [TelegramAuthController::class, 'createCodeByCredentials']);
Route::post('/auth/telegram/refresh', [TelegramAuthController::class, 'refreshToken']);
Route::middleware('auth:sanctum')->post('/v1/auth/telegram/code', [TelegramAuthController::class, 'createCode']);
Route::post('/requests', [RequestController::class, 'store']);
Route::middleware(['auth:sanctum', 'permission:leads.update'])->patch('/requests/{id}', [RequestController::class, 'update']);

// ── Public API v1 ────────────────────────────────────────────────────────────
// throttle:api (300/min per IP) + GET /apartments* throttle:apartments (120/min per IP)
Route::prefix('v1')->group(function () {
    Route::post('/requests', [RequestController::class, 'store']);
    Route::middleware(['auth:sanctum', 'permission:leads.update'])->patch('/requests/{id}', [RequestController::class, 'update']);
    Route::get('/complexes', [ComplexController::class, 'index']);
    Route::get('/complexes/{slug}', [ComplexController::class, 'show']);
    Route::get('/complexes/{slug}/apartments', [ComplexController::class, 'apartments']);
    Route::middleware('throttle:apartments')->group(function () {
        Route::get('/apartments', [ApartmentController::class, 'index']);
        Route::get('/apartments/{id}', [ApartmentController::class, 'show']);
    });
    Route::get('/map/complexes', [MapController::class, 'complexes']);
    Route::get('/search/complexes', [SearchComplexesController::class, 'index']);
    Route::get('/search/count', [SearchCountController::class, 'index']);
    Route::get('/search/suggest', [SuggestController::class, 'index']);
    Route::get('/contacts', [ContactsController::class, 'show']);
    Route::middleware('auth:sanctum')->get('/favorites', [FavoritesController::class, 'index']);
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
    Route::middleware('auth:sanctum')->prefix('crm')->group(function () {
        Route::get('/auth/me', [CrmAuthController::class, 'me']);
        Route::post('/auth/logout', [CrmAuthController::class, 'logout']);

        Route::get('/dashboard', [CrmDashboardController::class, 'index'])->middleware('permission:analytics.read');

        Route::get('/complexes', [CrmComplexController::class, 'index'])->middleware('permission:properties.read');
        Route::post('/complexes', [CrmComplexController::class, 'store'])->middleware('permission:properties.create');
        Route::get('/complexes/{complex}', [CrmComplexController::class, 'show'])->middleware('permission:properties.read');
        Route::put('/complexes/{complex}', [CrmComplexController::class, 'update'])->middleware('permission:properties.update');
        Route::patch('/complexes/{complex}', [CrmComplexController::class, 'update'])->middleware('permission:properties.update');
        Route::delete('/complexes/{complex}', [CrmComplexController::class, 'destroy'])->middleware('permission:properties.delete');
        // Extra apartment routes must be declared BEFORE apiResource to avoid {id} collision
        Route::post('/apartments/bulk', [CrmApartmentController::class, 'bulk'])->middleware('permission:properties.update');
        Route::get('/apartments-deleted', [CrmApartmentController::class, 'trashed'])->middleware('permission:properties.read');
        Route::get('/apartments', [CrmApartmentController::class, 'index'])->middleware('permission:properties.read');
        Route::post('/apartments', [CrmApartmentController::class, 'store'])->middleware('permission:properties.create');
        Route::get('/apartments/{apartment}', [CrmApartmentController::class, 'show'])->middleware('permission:properties.read');
        Route::put('/apartments/{apartment}', [CrmApartmentController::class, 'update'])->middleware('permission:properties.update');
        Route::patch('/apartments/{apartment}', [CrmApartmentController::class, 'update'])->middleware('permission:properties.update');
        Route::delete('/apartments/{apartment}', [CrmApartmentController::class, 'destroy'])->middleware('permission:properties.delete');
        Route::post('/apartments/{id}/restore', [CrmApartmentController::class, 'restore'])->middleware('permission:properties.update');
        Route::get('/apartments/{id}/history', [CrmApartmentController::class, 'history'])->middleware('permission:properties.read');
        Route::post('/apartments/{id}/lock', [CrmApartmentController::class, 'lock'])->middleware('permission:properties.update');
        Route::post('/apartments/{id}/unlock', [CrmApartmentController::class, 'unlock'])->middleware('permission:properties.update');

        Route::apiResource('builders', CrmBuilderController::class)->middleware('permission:properties.update');
        Route::apiResource('districts', CrmDistrictController::class)->middleware('permission:properties.update');

        Route::get('/monitoring', [CrmMonitoringController::class, 'index'])->middleware('permission:analytics.read');
        Route::get('/requests', [CrmLeadRequestController::class, 'index'])->middleware('permission:leads.read');
        Route::get('/requests/export', [CrmLeadRequestController::class, 'export'])->middleware('permission:leads.export');
        Route::post('/requests/bulk-accept', [CrmLeadRequestController::class, 'bulkAccept'])->middleware('permission:leads.assign');
        Route::patch('/requests/{id}', [CrmLeadRequestController::class, 'update'])->middleware('permission:leads.update');
        Route::put('/requests/{id}', [CrmLeadRequestController::class, 'update'])->middleware('permission:leads.update');
        Route::get('/settings/telegram', [CrmSettingsController::class, 'showTelegram'])->middleware('permission:settings.update');
        Route::put('/settings/telegram', [CrmSettingsController::class, 'updateTelegram'])->middleware('permission:settings.update');
        Route::post('/settings/telegram/test', [CrmSettingsController::class, 'testTelegram'])->middleware('permission:settings.update');
        Route::get('/settings/contacts', [CrmSettingsController::class, 'showContacts'])->middleware('permission:settings.update');
        Route::put('/settings/contacts', [CrmSettingsController::class, 'updateContacts'])->middleware('permission:settings.update');

        Route::get('/feed/status', [CrmFeedController::class, 'status'])->middleware('permission:integrations.manage');
        Route::post('/feed/download', [CrmFeedController::class, 'runDownload'])->middleware('permission:integrations.manage');
        Route::post('/feed/sync', [CrmFeedController::class, 'runSync'])->middleware('permission:integrations.manage');

        Route::get('/roles', [CrmRoleController::class, 'index'])->middleware('permission:roles.read');
        Route::post('/roles', [CrmRoleController::class, 'store'])->middleware('permission:roles.create');
        Route::put('/roles/{role}', [CrmRoleController::class, 'update'])->middleware('permission:roles.update');
        Route::get('/permissions', [CrmRoleController::class, 'permissions'])->middleware('permission:roles.read');
        Route::put('/roles/{role}/permissions', [CrmRoleController::class, 'syncRolePermissions'])->middleware('permission:roles.update');
        Route::get('/users', [CrmUserController::class, 'index'])->middleware('permission:users.read');
        Route::put('/users/{user}/role', [CrmUserController::class, 'updateRole'])->middleware('permission:users.update');

        // Reference helpers for forms
        Route::get('/finishings-list', function () {
            $finishings = Finishing::orderBy('name')->get()
                ->map(fn ($f) => ['id' => $f->id, 'name' => $f->name]);

            return response()->json(['data' => $finishings]);
        })->middleware('permission:properties.read');

        Route::get('/complexes/{id}/buildings', function (string $id) {
            $buildings = Building::where('block_id', $id)->orderBy('name')->get()
                ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name]);

            return response()->json(['data' => $buildings]);
        })->middleware('permission:properties.read');
    });
});

// ── API v2 — Entity System ────────────────────────────────────────────────────
Route::prefix('v2')->middleware('auth:sanctum')->group(function () {
    Route::get('/admin/entity-types', [EntitySchemaController::class, 'index'])->middleware('permission:entity_schema.manage');
    Route::post('/entity-types', [EntitySchemaController::class, 'storeType'])->middleware('permission:entity_schema.manage');
    Route::put('/entity-types/{entityType}', [EntitySchemaController::class, 'updateType'])->middleware('permission:entity_schema.manage');
    Route::post('/entity-types/{entityType}/fields', [EntitySchemaController::class, 'storeField'])->middleware('permission:entity_schema.manage');
    Route::put('/entity-fields/{entityField}', [EntitySchemaController::class, 'updateField'])->middleware('permission:entity_schema.manage');
    Route::delete('/entity-fields/{entityField}', [EntitySchemaController::class, 'destroyField'])->middleware('permission:entity_schema.manage');

    Route::get('/entity-types', [EntityController::class, 'types'])->middleware('permission:entities.read');
    Route::get('/entities/{type}', [EntityController::class, 'index'])->middleware('permission:entities.read');
    Route::post('/entities/{type}', [EntityController::class, 'store'])->middleware('permission:entities.create');
    Route::get('/entities/{type}/{id}', [EntityController::class, 'show'])->middleware('permission:entities.read');
    Route::get('/entities/{type}/{id}/history', [EntityController::class, 'history'])->middleware('permission:entities.read');
    Route::get('/entities/{type}/{id}/history/export', [EntityController::class, 'historyExport'])->middleware('permission:entities.read');
    Route::put('/entities/{id}', [EntityController::class, 'update'])->middleware('permission:entities.update');
    Route::delete('/entity-records/{id}', [EntityController::class, 'destroy'])->middleware('permission:entities.delete');
    Route::post('/entity-records/{id}/restore', [EntityController::class, 'restore'])->middleware('permission:entities.update');
    Route::post('/entity-records/bulk-delete', [EntityController::class, 'bulkDestroy'])->middleware('permission:entities.delete');
    Route::post('/entity-records/bulk-restore', [EntityController::class, 'bulkRestore'])->middleware('permission:entities.update');
    Route::patch('/entity-records/bulk-update', [EntityController::class, 'bulkUpdate'])->middleware('permission:entities.update');
});

<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\SyncComplexesSearchJob;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Building;
use App\Services\CacheInvalidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmApartmentController extends Controller
{
    // ─── LIST ────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Apartment::with(['complex', 'finishing'])
            ->where('is_active', 1);

        if ($v = $request->input('complex_id'))   $query->where('block_id', $v);
        if ($v = $request->input('rooms'))        $query->where('rooms_count', (int) $v);
        if ($v = $request->input('status'))       $query->where('status', $v);
        if ($v = $request->input('source'))       $query->where('source', $v);
        if ($v = $request->input('search'))       $query->where('number', 'like', "%{$v}%");
        if ($v = $request->input('price_min'))    $query->where('price', '>=', (int) $v);
        if ($v = $request->input('price_max'))    $query->where('price', '<=', (int) $v);
        if ($v = $request->input('floor_min'))    $query->where('floor', '>=', (int) $v);
        if ($v = $request->input('floor_max'))    $query->where('floor', '<=', (int) $v);

        $perPage = min((int) $request->input('per_page', 20), 100);
        $page    = max((int) $request->input('page', 1), 1);
        $total   = $query->count();

        $items = $query->orderByDesc('created_at')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get()
            ->map(fn($a) => $this->format($a));

        return response()->json([
            'data' => $items,
            'meta' => [
                'total'    => $total,
                'page'     => $page,
                'per_page' => $perPage,
                'pages'    => (int) ceil($total / $perPage),
            ],
        ]);
    }

    // ─── SHOW ─────────────────────────────────────────────────────────────────

    public function show(string $id): JsonResponse
    {
        $apt = Apartment::with(['complex', 'building', 'finishing'])->findOrFail($id);

        return response()->json(['data' => $this->format($apt, true)]);
    }

    // ─── CHANGE HISTORY ───────────────────────────────────────────────────────

    public function history(string $id): JsonResponse
    {
        Apartment::findOrFail($id); // 404 guard

        $history = DB::table('apartment_changes')
            ->where('apartment_id', $id)
            ->leftJoin('users', 'users.id', '=', 'apartment_changes.user_id')
            ->select('apartment_changes.*', 'users.name as user_name')
            ->orderByDesc('apartment_changes.created_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $history]);
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'block_id'    => 'required|string|exists:blocks,id',
            'building_id' => 'nullable|string|exists:buildings,id',
            'number'      => 'nullable|string|max:20',
            'floor'       => 'required|integer|min:1|max:200',
            'floors'      => 'nullable|integer|min:1|max:200',
            'rooms_count' => 'required|integer|min:0|max:10',
            'area_total'  => 'required|numeric|min:1|max:1000',
            'area_kitchen'=> 'nullable|numeric|min:0',
            'price'       => 'required|integer|min:1',
            'status'      => 'required|in:available,reserved,sold',
            'plan_image'  => 'nullable|url',
            'section'     => 'nullable|integer|min:1',
            'finishing_id'=> 'nullable|string|exists:finishings,id',
        ]);

        if (empty($validated['building_id'])) {
            $building = Building::where('block_id', $validated['block_id'])->first()
                ?? Building::create(['block_id' => $validated['block_id'], 'name' => 'Корпус 1', 'floors' => $validated['floors'] ?? 0, 'sections' => 1]);
            $validated['building_id'] = $building->id;
        }

        $validated['is_active'] = true;
        $validated['source']    = 'manual';

        $apt = Apartment::create($validated);
        $apt->load(['complex', 'finishing']);
        CacheInvalidator::complexSearch();
        SyncComplexesSearchJob::dispatch();

        return response()->json(['data' => $this->format($apt)], 201);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    public function update(Request $request, string $id): JsonResponse
    {
        $apt = Apartment::findOrFail($id);

        $validated = $request->validate([
            'block_id'      => 'sometimes|string|exists:blocks,id',
            'building_id'   => 'nullable|string|exists:buildings,id',
            'number'        => 'nullable|string|max:20',
            'floor'         => 'sometimes|integer|min:1|max:200',
            'floors'        => 'nullable|integer|min:1|max:200',
            'rooms_count'   => 'sometimes|integer|min:0|max:10',
            'area_total'    => 'sometimes|numeric|min:1|max:1000',
            'area_kitchen'  => 'nullable|numeric|min:0',
            'price'         => 'sometimes|integer|min:1',
            'status'        => 'sometimes|in:available,reserved,sold',
            'plan_image'    => 'nullable|url',
            'section'       => 'nullable|integer|min:1',
            'finishing_id'  => 'nullable|string|exists:finishings,id',
            'is_active'     => 'sometimes|boolean',
            'locked_fields' => 'nullable|array',
            'locked_fields.*' => 'string',
        ]);

        // Mark updated fields as locked (manual edit = protect from feed)
        $editedFields = array_keys(array_diff_key($validated, ['locked_fields' => true, 'is_active' => true]));
        if (!empty($editedFields)) {
            $current = $apt->locked_fields ?? [];
            $validated['locked_fields'] = array_values(array_unique(array_merge($current, $editedFields)));
            $validated['source'] = 'manual';
        }

        $apt->update($validated);
        $apt->load(['complex', 'finishing']);
        CacheInvalidator::complexSearch();

        return response()->json(['data' => $this->format($apt)]);
    }

    // ─── LOCK / UNLOCK FIELDS ─────────────────────────────────────────────────

    public function lock(Request $request, string $id): JsonResponse
    {
        $apt    = Apartment::findOrFail($id);
        $fields = $request->validate(['fields' => 'required|array', 'fields.*' => 'string'])['fields'];
        $apt->update(['locked_fields' => array_values(array_unique(array_merge($apt->locked_fields ?? [], $fields)))]);

        return response()->json(['locked_fields' => $apt->locked_fields]);
    }

    public function unlock(Request $request, string $id): JsonResponse
    {
        $apt    = Apartment::findOrFail($id);
        $fields = $request->validate(['fields' => 'required|array', 'fields.*' => 'string'])['fields'];
        $apt->update(['locked_fields' => array_values(array_diff($apt->locked_fields ?? [], $fields))]);

        return response()->json(['locked_fields' => $apt->locked_fields]);
    }

    // ─── BULK OPERATIONS ──────────────────────────────────────────────────────

    public function bulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids'        => 'required|array|min:1|max:500',
            'ids.*'      => 'string',
            'action'     => 'required|in:update_status,delete,restore,assign_complex',
            'status'     => 'required_if:action,update_status|in:available,reserved,sold',
            'complex_id' => 'required_if:action,assign_complex|string|exists:blocks,id',
        ]);

        $ids    = $validated['ids'];
        $action = $validated['action'];

        switch ($action) {
            case 'update_status':
                $count = Apartment::whereIn('id', $ids)->update([
                    'status'        => $validated['status'],
                    'locked_fields' => DB::raw("JSON_ARRAY_APPEND(COALESCE(locked_fields, JSON_ARRAY()), '$', 'status')"),
                    'source'        => 'manual',
                ]);
                CacheInvalidator::complexSearch();
                return response()->json(['updated' => $count, 'action' => $action]);

            case 'delete':
                $count = Apartment::whereIn('id', $ids)->delete();
                CacheInvalidator::complexSearch();
                return response()->json(['deleted' => $count, 'action' => $action]);

            case 'restore':
                $count = Apartment::withTrashed()->whereIn('id', $ids)->restore();
                CacheInvalidator::complexSearch();
                return response()->json(['restored' => $count, 'action' => $action]);

            case 'assign_complex':
                $count = Apartment::whereIn('id', $ids)->update(['block_id' => $validated['complex_id']]);
                CacheInvalidator::complexSearch();
                SyncComplexesSearchJob::dispatch();
                return response()->json(['updated' => $count, 'action' => $action]);
        }

        return response()->json(['message' => 'Unknown action'], 400);
    }

    // ─── DELETE / RESTORE ─────────────────────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        Apartment::findOrFail($id)->delete();
        CacheInvalidator::complexSearch();

        return response()->json(['message' => 'Квартира удалена (soft delete).']);
    }

    public function restore(string $id): JsonResponse
    {
        $apt = Apartment::withTrashed()->findOrFail($id);
        $apt->restore();
        CacheInvalidator::complexSearch();

        return response()->json(['message' => 'Квартира восстановлена.']);
    }

    // ─── TRASHED LIST ─────────────────────────────────────────────────────────

    public function trashed(Request $request): JsonResponse
    {
        $query = Apartment::onlyTrashed()->with(['complex']);
        if ($v = $request->input('complex_id')) $query->where('block_id', $v);

        $perPage = min((int) $request->input('per_page', 20), 100);
        $page    = max((int) $request->input('page', 1), 1);
        $total   = $query->count();
        $items   = $query->orderByDesc('deleted_at')->offset(($page - 1) * $perPage)->limit($perPage)->get()->map(fn($a) => $this->format($a));

        return response()->json(['data' => $items, 'meta' => ['total' => $total, 'page' => $page, 'per_page' => $perPage, 'pages' => (int) ceil($total / $perPage)]]);
    }

    // ─── FORMATTER ────────────────────────────────────────────────────────────

    private function format(Apartment $a, bool $full = false): array
    {
        $data = [
            'id'            => $a->id,
            'block_id'      => $a->block_id,
            'complex'       => $a->complex?->name,
            'building_id'   => $a->building_id,
            'number'        => $a->number,
            'floor'         => $a->floor,
            'floors'        => $a->floors,
            'rooms_count'   => $a->rooms_count,
            'area_total'    => (float) $a->area_total,
            'area_kitchen'  => $a->area_kitchen ? (float) $a->area_kitchen : null,
            'price'         => (int) $a->price,
            'status'        => $a->status,
            'source'        => $a->source ?? 'feed',
            'is_active'     => (bool) $a->is_active,
            'plan_image'    => $a->plan_image,
            'section'       => $a->section,
            'finishing_id'  => $a->finishing_id,
            'finishing'     => $a->finishing?->name,
            'locked_fields' => $a->locked_fields ?? [],
            'deleted_at'    => $a->deleted_at?->toISOString(),
        ];

        if ($full) {
            $data['history'] = DB::table('apartment_changes')
                ->where('apartment_id', $a->id)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
        }

        return $data;
    }
}

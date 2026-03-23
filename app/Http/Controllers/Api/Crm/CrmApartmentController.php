<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Building;
use App\Models\Catalog\Complex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmApartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Apartment::with(['complex', 'finishing'])
            ->where('is_active', 1);

        if ($complexId = $request->input('complex_id')) {
            $query->where('block_id', $complexId);
        }

        if ($rooms = $request->input('rooms')) {
            $query->where('rooms_count', $rooms);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where('number', 'like', "%{$search}%");
        }

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

    public function show(string $id): JsonResponse
    {
        $apt = Apartment::with(['complex', 'building', 'finishing'])->findOrFail($id);

        return response()->json(['data' => $this->format($apt, true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'block_id'    => 'required|string|exists:blocks,id',
            'building_id' => 'nullable|string|exists:buildings,id',
            'number'      => 'nullable|string|max:20',
            'floor'       => 'required|integer|min:1',
            'floors'      => 'nullable|integer|min:1',
            'rooms_count' => 'required|integer|min:0|max:10',
            'area_total'  => 'required|numeric|min:1',
            'area_kitchen'=> 'nullable|numeric|min:0',
            'price'       => 'required|integer|min:0',
            'status'      => 'required|in:available,reserved,sold',
            'plan_image'  => 'nullable|string|url',
            'section'     => 'nullable|integer|min:1',
            'finishing_id'=> 'nullable|integer|exists:finishings,id',
        ]);

        // Auto-resolve or create a building for this complex if not provided
        if (empty($validated['building_id'])) {
            $building = Building::where('block_id', $validated['block_id'])->first();

            if (! $building) {
                $building = Building::create([
                    'block_id' => $validated['block_id'],
                    'name'     => 'Корпус 1',
                    'floors'   => $validated['floors'] ?? 0,
                    'sections' => 1,
                ]);
            }

            $validated['building_id'] = $building->id;
        }

        $validated['is_active'] = true;

        $apt = Apartment::create($validated);
        $apt->load(['complex', 'finishing']);

        return response()->json(['data' => $this->format($apt)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $apt = Apartment::findOrFail($id);

        $validated = $request->validate([
            'block_id'    => 'sometimes|string|exists:blocks,id',
            'building_id' => 'nullable|string|exists:buildings,id',
            'number'      => 'nullable|string|max:20',
            'floor'       => 'sometimes|integer|min:1',
            'floors'      => 'nullable|integer|min:1',
            'rooms_count' => 'sometimes|integer|min:0|max:10',
            'area_total'  => 'sometimes|numeric|min:1',
            'area_kitchen'=> 'nullable|numeric|min:0',
            'price'       => 'sometimes|integer|min:0',
            'status'      => 'sometimes|in:available,reserved,sold',
            'plan_image'  => 'nullable|string|url',
            'section'     => 'nullable|integer|min:1',
            'finishing_id'=> 'nullable|integer|exists:finishings,id',
            'is_active'   => 'sometimes|boolean',
        ]);

        $apt->update($validated);
        $apt->load(['complex', 'finishing']);

        return response()->json(['data' => $this->format($apt)]);
    }

    public function destroy(string $id): JsonResponse
    {
        $apt = Apartment::findOrFail($id);
        $apt->delete();

        return response()->json(['message' => 'Квартира удалена.']);
    }

    private function format(Apartment $a, bool $full = false): array
    {
        $data = [
            'id'          => $a->id,
            'block_id'    => $a->block_id,
            'complex'     => $a->complex?->name,
            'building_id' => $a->building_id,
            'number'      => $a->number,
            'floor'       => $a->floor,
            'floors'      => $a->floors,
            'rooms_count' => $a->rooms_count,
            'area_total'  => (float) $a->area_total,
            'area_kitchen'=> $a->area_kitchen ? (float) $a->area_kitchen : null,
            'price'       => (int) $a->price,
            'status'      => $a->status,
            'is_active'   => (bool) $a->is_active,
            'plan_image'  => $a->plan_image,
            'section'     => $a->section,
            'finishing_id'=> $a->finishing_id,
            'finishing'   => $a->finishing?->name,
        ];

        return $data;
    }
}

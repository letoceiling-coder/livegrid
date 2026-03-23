<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Region;
use App\Services\CacheInvalidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CrmDistrictController extends Controller
{
    public function index(): JsonResponse
    {
        $regions = Region::orderBy('name')->get()->map(fn($d) => [
            'id'   => $d->id,
            'name' => $d->name,
        ]);

        return response()->json(['data' => $regions]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:regions,name',
        ]);

        $region = Region::create([
            'id'   => (string) Str::uuid(),
            'name' => $validated['name'],
        ]);

        CacheInvalidator::references();

        return response()->json(['data' => ['id' => $region->id, 'name' => $region->name]], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $region = Region::findOrFail($id);

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:regions,name,{$id}",
        ]);

        $region->update($validated);

        CacheInvalidator::references();

        return response()->json(['data' => ['id' => $region->id, 'name' => $region->name]]);
    }

    public function destroy(string $id): JsonResponse
    {
        $region = Region::findOrFail($id);

        $complexCount = \App\Models\Catalog\Complex::where('district_id', $id)->count();
        if ($complexCount > 0) {
            return response()->json([
                'message' => "Нельзя удалить: район используется в {$complexCount} ЖК.",
            ], 422);
        }

        $region->delete();
        CacheInvalidator::references();

        return response()->json(['message' => 'Район удалён.']);
    }
}

<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\District;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmDistrictController extends Controller
{
    public function index(): JsonResponse
    {
        $districts = District::orderBy('name')->get()->map(fn($d) => [
            'id'   => $d->id,
            'name' => $d->name,
        ]);

        return response()->json(['data' => $districts]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:districts,name',
        ]);

        $district = District::create($validated);

        return response()->json(['data' => ['id' => $district->id, 'name' => $district->name]], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $district = District::findOrFail($id);

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:districts,name,{$id}",
        ]);

        $district->update($validated);

        return response()->json(['data' => ['id' => $district->id, 'name' => $district->name]]);
    }

    public function destroy(int $id): JsonResponse
    {
        $district = District::findOrFail($id);

        $complexCount = \App\Models\Catalog\Complex::where('district_id', $id)->count();
        if ($complexCount > 0) {
            return response()->json([
                'message' => "Нельзя удалить: район используется в {$complexCount} ЖК.",
            ], 422);
        }

        $district->delete();

        return response()->json(['message' => 'Район удалён.']);
    }
}

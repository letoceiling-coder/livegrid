<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Builder;
use App\Services\CacheInvalidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmBuilderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $builders = Builder::orderBy('name')->get()->map(fn($b) => [
            'id'   => $b->id,
            'name' => $b->name,
        ]);

        return response()->json(['data' => $builders]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:builders,name',
        ]);

        $builder = Builder::create($validated);
        CacheInvalidator::references();

        return response()->json(['data' => ['id' => $builder->id, 'name' => $builder->name]], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $builder = Builder::findOrFail($id);

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:builders,name,{$id}",
        ]);

        $builder->update($validated);
        CacheInvalidator::references();

        return response()->json(['data' => ['id' => $builder->id, 'name' => $builder->name]]);
    }

    public function destroy(int $id): JsonResponse
    {
        $builder = Builder::findOrFail($id);

        $complexCount = \App\Models\Catalog\Complex::where('builder_id', $id)->count();
        if ($complexCount > 0) {
            return response()->json([
                'message' => "Нельзя удалить: застройщик используется в {$complexCount} ЖК.",
            ], 422);
        }

        $builder->delete();
        CacheInvalidator::references();

        return response()->json(['message' => 'Застройщик удалён.']);
    }
}

<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Complex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

class CrmComplexController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Complex::with(['builder', 'district'])
            ->withCount('apartments');

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($builderId = $request->input('builder_id')) {
            $query->where('builder_id', $builderId);
        }

        if ($districtId = $request->input('district_id')) {
            $query->where('district_id', $districtId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $page    = max((int) $request->input('page', 1), 1);

        $total = $query->count();
        $items = $query->orderByDesc('created_at')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get()
            ->map(fn($c) => $this->format($c));

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
        $complex = Complex::with(['builder', 'district', 'subways', 'buildings'])
            ->findOrFail($id);

        return response()->json(['data' => $this->format($complex, true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'builder_id'     => 'nullable|integer|exists:builders,id',
            'district_id'    => 'nullable|integer|exists:districts,id',
            'address'        => 'nullable|string|max:500',
            'lat'            => 'nullable|numeric|between:-90,90',
            'lng'            => 'nullable|numeric|between:-180,180',
            'status'         => 'nullable|string|in:selling,completed,planned,building',
            'deadline'       => 'nullable|string|max:50',
            'description'    => 'nullable|string',
            'images'         => 'nullable|array',
            'images.*'       => 'nullable|string|url',
            'advantages'     => 'nullable|array',
            'advantages.*'   => 'nullable|string|max:200',
            'infrastructure' => 'nullable|array',
            'infrastructure.*' => 'nullable|string|max:200',
        ]);

        $validated['slug'] = $this->uniqueSlug($validated['name']);

        $complex = Complex::create($validated);
        $complex->load(['builder', 'district']);
        $this->syncSearch();

        return response()->json(['data' => $this->format($complex)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $complex = Complex::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|required|string|max:255',
            'builder_id'     => 'nullable|integer|exists:builders,id',
            'district_id'    => 'nullable|integer|exists:districts,id',
            'address'        => 'nullable|string|max:500',
            'lat'            => 'nullable|numeric|between:-90,90',
            'lng'            => 'nullable|numeric|between:-180,180',
            'status'         => 'nullable|string|in:selling,completed,planned,building',
            'deadline'       => 'nullable|string|max:50',
            'description'    => 'nullable|string',
            'images'         => 'nullable|array',
            'images.*'       => 'nullable|string|url',
            'advantages'     => 'nullable|array',
            'advantages.*'   => 'nullable|string|max:200',
            'infrastructure' => 'nullable|array',
            'infrastructure.*' => 'nullable|string|max:200',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $complex->name) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], $complex->id);
        }

        $complex->update($validated);
        $complex->load(['builder', 'district']);
        $this->syncSearch();

        return response()->json(['data' => $this->format($complex)]);
    }

    public function destroy(string $id): JsonResponse
    {
        $complex = Complex::findOrFail($id);
        $complex->delete();
        $this->syncSearch();

        return response()->json(['message' => 'Комплекс удалён.']);
    }

    private function syncSearch(): void
    {
        try {
            Artisan::call('complexes:sync-search');
        } catch (\Throwable) {
            // Non-critical — search index will sync on next manual sync
        }
    }

    private function format(Complex $c, bool $full = false): array
    {
        $data = [
            'id'          => $c->id,
            'name'        => $c->name,
            'slug'        => $c->slug,
            'builder_id'  => $c->builder_id,
            'builder'     => $c->builder?->name,
            'district_id' => $c->district_id,
            'district'    => $c->district?->name,
            'address'     => $c->address,
            'lat'         => $c->lat ? (float) $c->lat : null,
            'lng'         => $c->lng ? (float) $c->lng : null,
            'status'      => $c->status,
            'deadline'    => $c->deadline,
            'images'      => $c->images ?? [],
            'apartments_count' => $c->apartments_count ?? null,
        ];

        if ($full) {
            $data['description']    = $c->description;
            $data['advantages']     = $c->advantages ?? [];
            $data['infrastructure'] = $c->infrastructure ?? [];
        }

        return $data;
    }

    private function uniqueSlug(string $name, ?string $excludeId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;

        while (
            Complex::where('slug', $slug)
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}

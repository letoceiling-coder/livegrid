<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ComplexResource;
use App\Models\Catalog\Complex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplexController extends Controller
{
    /**
     * Список комплексов (краткая форма)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Complex::with(['district', 'builder', 'subways'])
            ->withCount(['apartments as available_count' => fn($q) =>
                $q->where('is_active', 1)->whereIn('status', ['available', 'reserved'])
            ]);

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
        $total   = $query->count();

        $items = $query->orderBy('name')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return response()->json([
            'data' => $items->map(fn($c) => [
                'id'      => $c->id,
                'slug'    => $c->slug,
                'name'    => $c->name,
                'address' => $c->address,
                'status'  => $c->status,
                'deadline' => $c->deadline,
                'district' => $c->district?->name,
                'builder'  => $c->builder?->name,
                'subway'   => $c->subways->first()?->name,
                'lat'      => (float) $c->lat,
                'lng'      => (float) $c->lng,
                'images'   => $c->images ?? [],
                'available_apartments' => $c->available_count,
            ]),
            'meta' => [
                'total'    => $total,
                'page'     => $page,
                'per_page' => $perPage,
                'pages'    => (int) ceil($total / $perPage),
            ],
        ]);
    }

    /**
     * Получить детальную информацию о комплексе
     */
    public function show(string $slug): JsonResponse
    {
        $with = [
            'district',
            'builder',
            'subways',
            'buildings.apartments' => function ($query) {
                $query->where('is_active', 1)
                    ->whereIn('status', ['available', 'reserved'])
                    ->with('finishing');
            },
        ];

        // Direct lookup by blocks.slug
        $complex = Complex::with($with)->where('slug', $slug)->first();

        // Fallback: find via complexes_search (blocks.slug may be empty)
        if (!$complex) {
            $row = DB::table('complexes_search')->where('slug', $slug)->first();
            if ($row) {
                $complex = Complex::with($with)->find($row->complex_id);
            }
        }

        if (!$complex) {
            abort(404);
        }

        return response()->json([
            'data' => new ComplexResource($complex),
        ]);
    }
    
    /**
     * Получить квартиры комплекса
     */
    public function apartments(Request $request, string $slug): JsonResponse
    {
        $complex = Complex::where('slug', $slug)->firstOrFail();
        
        $query = $complex->apartments()
            ->where('is_active', 1)
            ->whereIn('status', ['available', 'reserved']);
        
        // Фильтры
        if ($request->has('rooms')) {
            $query->where('rooms_count', $request->input('rooms'));
        }
        
        if ($request->has('areaMin')) {
            $query->where('area_total', '>=', $request->input('areaMin'));
        }
        
        if ($request->has('areaMax')) {
            $query->where('area_total', '<=', $request->input('areaMax'));
        }
        
        if ($request->has('floorMin')) {
            $query->where('floor', '>=', $request->input('floorMin'));
        }
        
        if ($request->has('floorMax')) {
            $query->where('floor', '<=', $request->input('floorMax'));
        }
        
        if ($request->has('priceMin')) {
            $query->where('price', '>=', $request->input('priceMin'));
        }
        
        if ($request->has('priceMax')) {
            $query->where('price', '<=', $request->input('priceMax'));
        }
        
        if ($request->has('finishing')) {
            $query->whereIn('finishing_id', $request->input('finishing'));
        }
        
        if ($request->has('status')) {
            $query->whereIn('status', $request->input('status'));
        }
        
        // Сортировка
        $sort = $request->input('sort', 'price');
        $order = $request->input('order', 'asc');
        
        $query->orderBy($sort, $order);
        
        $total = $query->count();
        $apartments = $query->get();
        
        return response()->json([
            'data' => $apartments->map(function ($apartment) {
                return [
                    'id' => $apartment->id,
                    'complexId' => $apartment->block_id,
                    'buildingId' => $apartment->building_id,
                    'rooms' => $apartment->rooms_count,
                    'area' => (float) $apartment->area_total,
                    'kitchenArea' => $apartment->area_kitchen ? (float) $apartment->area_kitchen : null,
                    'floor' => $apartment->floor,
                    'totalFloors' => $apartment->floors,
                    'price' => (int) $apartment->price,
                    'pricePerMeter' => $apartment->area_total > 0
                        ? round((float) $apartment->price / (float) $apartment->area_total)
                        : 0,
                    'finishing' => $apartment->finishing ? $apartment->finishing->name : null,
                    'status' => $apartment->status,
                    'planImage' => $apartment->plan_image,
                    'section' => $apartment->section,
                ];
            }),
            'meta' => [
                'total' => $total,
            ],
        ]);
    }
}

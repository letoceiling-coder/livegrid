<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ComplexResource;
use App\Models\Catalog\Complex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplexController extends Controller
{
    /**
     * Получить детальную информацию о комплексе
     */
    public function show(string $slug): JsonResponse
    {
        $complex = Complex::with([
            'district',
            'builder',
            'subways',
            'buildings.apartments' => function ($query) {
                $query->where('is_active', 1)
                    ->whereIn('status', ['available', 'reserved']);
            },
        ])->where('slug', $slug)->firstOrFail();
        
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
                    'pricePerMeter' => (float) $apartment->price_per_meter,
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

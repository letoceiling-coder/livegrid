<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use Illuminate\Http\JsonResponse;

class ApartmentController extends Controller
{
    /**
     * Получить детальную информацию о квартире
     */
    public function show(string $id): JsonResponse
    {
        $apartment = Apartment::with([
            'complex',
            'complex.district',
            'complex.builder',
            'complex.subways',
            'building',
            'finishing',
        ])->findOrFail($id);
        
        // Получить ближайшее метро
        $subway = $apartment->complex->subways()->first();
        
        return response()->json([
            'data' => [
                'apartment' => [
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
                ],
                'complex' => [
                    'id' => $apartment->complex->id,
                    'name' => $apartment->complex->name,
                    'slug' => $apartment->complex->slug,
                    'address' => $apartment->complex->address,
                    'district' => $apartment->complex->district ? $apartment->complex->district->name : null,
                    'subway' => $subway ? $subway->name : null,
                    'subwayDistance' => $subway ? $subway->pivot->distance_time . ' мин' : null,
                    'builder' => $apartment->complex->builder ? $apartment->complex->builder->name : null,
                ],
                'building' => [
                    'id' => $apartment->building->id,
                    'name' => $apartment->building->name,
                    'deadline' => $apartment->building->deadline ? $apartment->building->deadline->format('Y-m-d') : null,
                ],
            ],
        ]);
    }
}

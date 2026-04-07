<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentResource;
use App\Models\Catalog\Apartment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentController extends Controller
{
    /**
     * Список квартир с пагинацией и фильтрами
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Apartment::with(['finishing', 'complex'])
            ->where('is_active', 1)
            ->whereIn('status', ['available', 'reserved']);

        if ($v = $request->input('block_id')) {
            $query->where('block_id', $v);
        }
        if ($v = $request->input('rooms')) {
            $query->where('rooms_count', (int) $v);
        }
        if ($v = $request->input('status')) {
            $query->where('status', $v);
        }
        if ($v = $request->input('price_min', $request->input('price_from'))) {
            $query->where('price', '>=', (int) $v);
        }
        if ($v = $request->input('price_max', $request->input('price_to'))) {
            $query->where('price', '<=', (int) $v);
        }
        if ($v = $request->input('area_min', $request->input('area_from'))) {
            $query->where('area_total', '>=', (float) $v);
        }
        if ($v = $request->input('area_max', $request->input('area_to'))) {
            $query->where('area_total', '<=', (float) $v);
        }
        if ($v = $request->input('floor_min', $request->input('floor_from'))) {
            $query->where('floor', '>=', (int) $v);
        }
        if ($v = $request->input('floor_max', $request->input('floor_to'))) {
            $query->where('floor', '<=', (int) $v);
        }
        if ($v = $request->input('finishing_id')) {
            $query->where('finishing_id', $v);
        }
        if ($v = $request->input('district_id')) {
            $query->whereHas('complex', fn ($q) => $q->where('district_id', $v));
        }
        if ($v = $request->input('deadline_from')) {
            $query->whereHas('building', fn ($q) => $q->whereDate('deadline', '>=', $v));
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return ApartmentResource::collection($query->orderBy('price')->paginate($perPage));
    }

    /**
     * Детальная информация о квартире
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

        $complex = $apartment->complex;
        $subway  = $complex?->subways()->first();
        $building = $apartment->building;

        $pricePerMeter = ($apartment->area_total > 0)
            ? (int) round($apartment->price / $apartment->area_total)
            : 0;

        return response()->json([
            'data' => [
                'apartment' => [
                    'id'            => $apartment->id,
                    'complexId'     => $apartment->block_id,
                    'buildingId'    => $apartment->building_id,
                    'rooms'         => $apartment->rooms_count,
                    'area'          => (float) $apartment->area_total,
                    'kitchenArea'   => $apartment->area_kitchen ? (float) $apartment->area_kitchen : null,
                    'floor'         => $apartment->floor,
                    'totalFloors'   => $apartment->floors,
                    'price'         => (int) $apartment->price,
                    'pricePerMeter' => $pricePerMeter,
                    'finishing'     => $apartment->finishing?->name,
                    'status'        => $apartment->status,
                    'planImage'     => $apartment->plan_image,
                    'section'       => $apartment->section,
                ],
                'complex' => $complex ? [
                    'id'             => $complex->id,
                    'name'           => $complex->name,
                    'slug'           => $complex->slug,
                    'address'        => $complex->address,
                    'district'       => $complex->district?->name,
                    'subway'         => $subway?->name,
                    'subwayDistance' => $subway ? ($subway->pivot->distance_time . ' мин') : null,
                    'builder'        => $complex->builder?->name,
                ] : null,
                'building' => $building ? [
                    'id'       => $building->id,
                    'name'     => $building->name,
                    'deadline' => $building->deadline ? (string) $building->deadline : null,
                ] : null,
            ],
        ]);
    }
}

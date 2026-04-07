<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentResource;
use App\Models\Catalog\Apartment;
use App\Services\Catalog\ApartmentSearchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentController extends Controller
{
    /**
     * Список квартир: фильтры по apartments_search, пагинация page / per_page,
     * сортировка sort=price_asc|price_desc|area_desc|deadline, фасеты (кэш 45 с).
     */
    public function index(Request $request, ApartmentSearchService $searchService): AnonymousResourceCollection
    {
        if ($searchService->searchable()) {
            $result = $searchService->search($request);

            return ApartmentResource::collection($result['paginator'])
                ->additional([
                    'facets' => $result['facets'],
                ]);
        }

        return $this->indexLegacy($request);
    }

    /**
     * Fallback без apartments_search: прямые запросы к apartments + JOIN apartment_attributes при фильтрах EAV.
     */
    private function indexLegacy(Request $request): AnonymousResourceCollection
    {
        $query = Apartment::with(['finishing', 'complex', 'roomType'])
            ->where('is_active', 1)
            ->whereIn('status', ['available', 'reserved']);

        $hasAttributeFilters = $request->filled('wc_count')
            || $request->filled('height')
            || $request->filled('number');

        if ($hasAttributeFilters) {
            $query->select('apartments.*');
        }

        $this->applyApartmentAttributeJoinFilters($request, $query);

        if ($hasAttributeFilters) {
            $query->distinct();
        }

        if ($v = $request->input('block_id')) {
            $query->where('apartments.block_id', $v);
        }
        if ($v = $request->input('rooms')) {
            $query->where('apartments.rooms_count', (int) $v);
        }
        if ($v = $request->input('status')) {
            $query->where('apartments.status', $v);
        }
        if ($v = $request->input('price_min', $request->input('price_from'))) {
            $query->where('apartments.price', '>=', (int) $v);
        }
        if ($v = $request->input('price_max', $request->input('price_to'))) {
            $query->where('apartments.price', '<=', (int) $v);
        }
        if ($v = $request->input('area_min', $request->input('area_from'))) {
            $query->where('apartments.area_total', '>=', (float) $v);
        }
        if ($v = $request->input('area_max', $request->input('area_to'))) {
            $query->where('apartments.area_total', '<=', (float) $v);
        }
        if ($v = $request->input('floor_min', $request->input('floor_from'))) {
            $query->where('apartments.floor', '>=', (int) $v);
        }
        if ($v = $request->input('floor_max', $request->input('floor_to'))) {
            $query->where('apartments.floor', '<=', (int) $v);
        }
        if ($v = $request->input('finishing_id')) {
            $query->where('apartments.finishing_id', $v);
        }
        if ($v = $request->input('district_id')) {
            $query->whereHas('complex', fn ($q) => $q->where('district_id', $v));
        }
        if ($v = $request->input('deadline_from')) {
            $query->whereHas('building', fn ($q) => $q->whereDate('deadline', '>=', $v));
        }

        $perPage = min(max(1, (int) $request->input('per_page', 20)), 100);
        $page = max(1, (int) $request->input('page', 1));

        return ApartmentResource::collection(
            $query->orderBy('apartments.price')->paginate($perPage, ['*'], 'page', $page)->withQueryString()
        );
    }

    private function applyApartmentAttributeJoinFilters(Request $request, Builder $query): void
    {
        $definitions = [
            'wc_count' => ['column' => 'value_int', 'cast' => 'int'],
            'height' => ['column' => 'value_float', 'cast' => 'float'],
            'number' => ['column' => 'value_string', 'cast' => 'string'],
        ];

        $i = 0;
        foreach ($definitions as $param => $def) {
            if (! $request->filled($param)) {
                continue;
            }

            $aa = 'apartment_attributes_'.$i;
            $at = 'attributes_'.$i;
            $i++;

            $query->join("apartment_attributes as {$aa}", function ($join) use ($aa) {
                $join->on('apartments.id', '=', "{$aa}.apartment_id");
            });
            $query->join("attributes as {$at}", function ($join) use ($at, $aa, $param) {
                $join->on("{$at}.id", '=', "{$aa}.attribute_id")
                    ->where("{$at}.code", '=', $param);
            });

            $raw = $request->input($param);
            if ($def['cast'] === 'int') {
                $query->where("{$aa}.{$def['column']}", (int) $raw);
            } elseif ($def['cast'] === 'float') {
                $query->where("{$aa}.{$def['column']}", (float) $raw);
            } else {
                $query->where("{$aa}.{$def['column']}", (string) $raw);
            }
        }
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
        $subway = $complex?->subways()->first();
        $building = $apartment->building;

        $pricePerMeter = ($apartment->area_total > 0)
            ? (int) round($apartment->price / $apartment->area_total)
            : 0;

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
                    'pricePerMeter' => $pricePerMeter,
                    'finishing' => $apartment->finishing?->name,
                    'status' => $apartment->status,
                    'planImage' => $apartment->plan_image,
                    'section' => $apartment->section,
                ],
                'complex' => $complex ? [
                    'id' => $complex->id,
                    'name' => $complex->name,
                    'slug' => $complex->slug,
                    'address' => $complex->address,
                    'district' => $complex->district?->name,
                    'subway' => $subway?->name,
                    'subwayDistance' => $subway ? ($subway->pivot->distance_time.' мин') : null,
                    'builder' => $complex->builder?->name,
                ] : null,
                'building' => $building ? [
                    'id' => $building->id,
                    'name' => $building->name,
                    'deadline' => $building->deadline ? (string) $building->deadline : null,
                ] : null,
            ],
        ]);
    }
}

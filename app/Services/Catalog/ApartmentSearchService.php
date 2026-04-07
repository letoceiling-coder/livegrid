<?php

namespace App\Services\Catalog;

use App\Models\Catalog\Apartment;
use App\Models\Catalog\Finishing;
use App\Services\CacheInvalidator;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Фильтрация и фасеты по денормализованной таблице apartments_search (без JOIN к apartment_attributes).
 */
class ApartmentSearchService
{
    private const CACHE_TTL_SECONDS = 45;

    public function searchable(): bool
    {
        return Schema::hasTable('apartments_search');
    }

    /**
     * @return array{paginator: LengthAwarePaginator, facets: array}
     */
    public function search(Request $request): array
    {
        $perPage = min(max(1, (int) $request->input('per_page', 20)), 100);
        $page = max(1, (int) $request->input('page', 1));

        $facets = $this->cacheRemember(
            $this->facetsCacheKey($request),
            fn () => $this->computeFacets(clone $this->filteredQuery($request))
        );

        /** @var array{total: int, ids: list<string>} $pageData */
        $pageData = $this->cacheRemember(
            $this->pageSliceCacheKey($request, $perPage, $page),
            function () use ($request, $perPage, $page) {
                $query = $this->filteredQuery($request);
                $this->applySort($request, $query);
                $p = $query->paginate($perPage, ['id'], 'page', $page);

                return [
                    'total' => $p->total(),
                    'ids' => collect($p->items())->pluck('id')->all(),
                ];
            }
        );

        $total = (int) $pageData['total'];
        /** @var list<string> $ids */
        $ids = $pageData['ids'];

        if ($ids === []) {
            $emptyPaginator = new LengthAwarePaginator(
                collect(),
                $total,
                $perPage,
                $page,
                [
                    'path' => LengthAwarePaginator::resolveCurrentPath(),
                    'pageName' => 'page',
                ]
            );
            $emptyPaginator->withQueryString();

            return ['paginator' => $emptyPaginator, 'facets' => $facets];
        }

        $apartments = $this->loadApartmentsOrderedByIds($ids);

        $apartmentPaginator = new LengthAwarePaginator(
            $apartments,
            $total,
            $perPage,
            $page,
            [
                'path' => LengthAwarePaginator::resolveCurrentPath(),
                'pageName' => 'page',
            ]
        );
        $apartmentPaginator->withQueryString();

        return ['paginator' => $apartmentPaginator, 'facets' => $facets];
    }

    /**
     * @template T
     *
     * @param  \Closure(): T  $callback
     * @return T
     */
    private function cacheRemember(string $key, \Closure $callback): mixed
    {
        try {
            return Cache::tags(['apartments'])->remember($key, self::CACHE_TTL_SECONDS, $callback);
        } catch (\BadMethodCallException) {
            $versionedKey = 'apartments_search:v'.CacheInvalidator::searchVersion().':'.$key;

            return Cache::remember($versionedKey, self::CACHE_TTL_SECONDS, $callback);
        }
    }

    /**
     * Один запрос whereIn + eager load; порядок как в пагинации (CASE WHEN для совместимости с MySQL).
     *
     * @param  list<string>  $ids
     */
    private function loadApartmentsOrderedByIds(array $ids): Collection
    {
        $base = Apartment::query()
            ->with(['finishing', 'complex', 'roomType'])
            ->whereIn('id', $ids);

        if ($ids === []) {
            return collect();
        }

        if (DB::connection()->getDriverName() === 'mysql') {
            $orderedIds = array_values($ids);
            $parts = [];
            $bindings = [];
            foreach ($orderedIds as $i => $id) {
                $parts[] = 'WHEN id = ? THEN ?';
                $bindings[] = $id;
                $bindings[] = $i;
            }
            $caseSql = 'CASE '.implode(' ', $parts).' ELSE 999999 END';

            return $base->orderByRaw($caseSql, $bindings)->get();
        }

        $idPositions = array_flip($ids);

        return $base->get()->sortBy(fn ($a) => $idPositions[$a->id] ?? PHP_INT_MAX)->values();
    }

    private function applySort(Request $request, Builder $query): void
    {
        $sort = (string) $request->input('sort', 'price_asc');

        match ($sort) {
            'price_desc' => $query->orderBy('price', 'desc'),
            'price_asc' => $query->orderBy('price', 'asc'),
            'area_desc' => $query->orderBy('area_total', 'desc'),
            'deadline' => $query->orderByRaw('deadline IS NULL, deadline ASC'),
            default => $query->orderBy('price', 'asc'),
        };
    }

    private function facetsCacheKey(Request $request): string
    {
        $params = $request->query();
        unset($params['page'], $params['per_page'], $params['sort']);

        return 'facets:'.hash('sha256', $this->canonicalQueryJson($params));
    }

    private function pageSliceCacheKey(Request $request, int $perPage, int $page): string
    {
        $params = $request->query();
        $params['_pp'] = $perPage;
        $params['_p'] = $page;

        return 'slice:'.hash('sha256', $this->canonicalQueryJson($params));
    }

    private function canonicalQueryJson(array $params): string
    {
        ksort($params);

        return json_encode($params, JSON_UNESCAPED_UNICODE) ?: '{}';
    }

    private function filteredQuery(Request $request): Builder
    {
        $q = DB::table('apartments_search')
            ->where('is_active', 1)
            ->whereIn('status', ['available', 'reserved']);

        if ($v = $request->input('block_id')) {
            $q->where('block_id', $v);
        }
        if ($v = $request->input('rooms')) {
            $q->where('rooms_count', (int) $v);
        }
        if ($v = $request->input('status')) {
            $q->where('status', $v);
        }
        if ($v = $request->input('price_min', $request->input('price_from'))) {
            $q->where('price', '>=', (int) $v);
        }
        if ($v = $request->input('price_max', $request->input('price_to'))) {
            $q->where('price', '<=', (int) $v);
        }
        if ($v = $request->input('area_min', $request->input('area_from'))) {
            $q->where('area_total', '>=', (float) $v);
        }
        if ($v = $request->input('area_max', $request->input('area_to'))) {
            $q->where('area_total', '<=', (float) $v);
        }
        if ($v = $request->input('floor_min', $request->input('floor_from'))) {
            $q->where('floor', '>=', (int) $v);
        }
        if ($v = $request->input('floor_max', $request->input('floor_to'))) {
            $q->where('floor', '<=', (int) $v);
        }
        if ($v = $request->input('finishing_id')) {
            $q->where('finishing_id', $v);
        }
        if ($v = $request->input('district_id')) {
            $q->where('district_id', $v);
        }
        if ($v = $request->input('deadline_from')) {
            $q->whereDate('deadline', '>=', $v);
        }
        if ($request->filled('wc_count')) {
            $q->where('wc_count', (int) $request->input('wc_count'));
        }
        if ($request->filled('height')) {
            $q->where('height', (float) $request->input('height'));
        }
        if ($request->filled('number')) {
            $q->where('number', (string) $request->input('number'));
        }

        return $q;
    }

    private function computeFacets(Builder $query): array
    {
        $rooms = (clone $query)->select('rooms_count')->distinct()->orderBy('rooms_count')
            ->pluck('rooms_count')
            ->map(fn ($v) => (int) $v)->values()->all();

        $finishingIds = (clone $query)->whereNotNull('finishing_id')->select('finishing_id')->distinct()->pluck('finishing_id');
        $finishings = $finishingIds->isEmpty()
            ? []
            : Finishing::query()->whereIn('id', $finishingIds)->orderBy('name')->get(['id', 'name'])
                ->map(fn ($f) => ['id' => $f->id, 'name' => $f->name])->values()->all();

        $priceAgg = (clone $query)->selectRaw('MIN(price) as min_price, MAX(price) as max_price')->first();
        $areaAgg = (clone $query)->selectRaw('MIN(area_total) as min_area, MAX(area_total) as max_area')->first();
        $floorAgg = (clone $query)->selectRaw('MIN(floor) as min_floor, MAX(floor) as max_floor')->first();

        return [
            'rooms' => $rooms,
            'finishings' => $finishings,
            'price' => [
                'min' => $priceAgg && $priceAgg->min_price !== null ? (int) $priceAgg->min_price : null,
                'max' => $priceAgg && $priceAgg->max_price !== null ? (int) $priceAgg->max_price : null,
            ],
            'area' => [
                'min' => $areaAgg && $areaAgg->min_area !== null ? (float) $areaAgg->min_area : null,
                'max' => $areaAgg && $areaAgg->max_area !== null ? (float) $areaAgg->max_area : null,
            ],
            'floor' => [
                'min' => $floorAgg && $floorAgg->min_floor !== null ? (int) $floorAgg->min_floor : null,
                'max' => $floorAgg && $floorAgg->max_floor !== null ? (int) $floorAgg->max_floor : null,
            ],
            'deadline_buckets' => $this->deadlineBuckets(clone $query),
        ];
    }

    /**
     * Группировка по году сдачи (apartments_search.deadline).
     *
     * @return list<array{year: int, count: int}>
     */
    private function deadlineBuckets(Builder $query): array
    {
        $q = (clone $query)->whereNotNull('deadline');

        if (DB::connection()->getDriverName() === 'mysql') {
            $rows = $q->selectRaw('YEAR(deadline) as bucket_year, COUNT(*) as cnt')
                ->groupByRaw('YEAR(deadline)')
                ->orderBy('bucket_year')
                ->get();
        } else {
            $rows = $q->selectRaw("strftime('%Y', deadline) as bucket_year, COUNT(*) as cnt")
                ->groupByRaw("strftime('%Y', deadline)")
                ->orderBy('bucket_year')
                ->get();
        }

        return $rows->map(fn ($r) => [
            'year' => (int) $r->bucket_year,
            'count' => (int) $r->cnt,
        ])->values()->all();
    }
}

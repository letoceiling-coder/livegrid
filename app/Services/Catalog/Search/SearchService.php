<?php

namespace App\Services\Catalog\Search;

use App\Services\CacheInvalidator;
use App\Support\FormatsImages;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SearchService
{
    use FormatsImages;
    /**
     * Поиск комплексов с фильтрацией
     * 
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @return array
     */
    public function searchComplexes(array $filters, int $page = 1, int $perPage = 20): array
    {
        // Генерация ключа кэша
        $cacheKey = $this->generateCacheKey($filters, $page, $perPage);
        
        // Попытка получить из кэша
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }
        
        // Построение запроса
        $query = DB::table('complexes_search')
            ->where('status', '!=', 'deleted')
            ->where('available_apartments', '>', 0);
        
        // Применение фильтров
        $this->applyFilters($query, $filters);
        
        // Подсчет общего количества (до пагинации)
        $total = $query->count();
        
        // Применение сортировки
        $this->applySorting($query, $filters);
        
        // Применение пагинации
        $complexes = $query
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();
        
        // Fetch per-room-type breakdown (single query for all complexes in page)
        $complexIds = $complexes->pluck('complex_id')->toArray();
        $roomBreakdown = $this->fetchRoomBreakdown($complexIds);

        // Форматирование результата
        $result = [
            'data' => $complexes->map(function ($complex) use ($roomBreakdown) {
                return $this->formatComplex($complex, $roomBreakdown[$complex->complex_id] ?? collect());
            })->toArray(),
            'meta' => [
                'total' => $total,
                'page' => $page,
                'perPage' => $perPage,
                'lastPage' => (int) ceil($total / $perPage),
            ],
        ];
        
        Cache::put($cacheKey, $result, 120);
        
        return $result;
    }

    /**
     * Агрегаты по тем же фильтрам, что и список ЖК: число комплексов и сумма доступных квартир.
     *
     * @return array{complexes: int, apartments: int}
     */
    public function countSearch(array $filters): array
    {
        $makeBase = function () use ($filters) {
            $q = DB::table('complexes_search')
                ->where('status', '!=', 'deleted')
                ->where('available_apartments', '>', 0);
            $this->applyFilters($q, $filters);

            return $q;
        };

        $complexes = (int) $makeBase()->count();
        $apartments = (int) $makeBase()->sum('available_apartments');

        return [
            'complexes'  => $complexes,
            'apartments' => $apartments,
        ];
    }

    /**
     * Применение фильтров к запросу
     */
    private function applyFilters($query, array $filters): void
    {
        // Текстовый поиск — LIKE по 5 полям (поддерживает частичные строки "ко", "кот")
        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            \Illuminate\Support\Facades\Log::debug('[SearchService] search incoming', ['q' => $search]);
            $query->where(function ($q) use ($search) {
                $q->where('name',         'LIKE', "%{$search}%")
                  ->orWhere('address',     'LIKE', "%{$search}%")
                  ->orWhere('builder_name','LIKE', "%{$search}%")
                  ->orWhere('district_name','LIKE', "%{$search}%")
                  ->orWhere('subway_name', 'LIKE', "%{$search}%");
            });
            \Illuminate\Support\Facades\Log::debug('[SearchService] search SQL', [
                'sql'      => $query->toSql(),
                'bindings' => $query->getBindings(),
            ]);
        }
        
        // Фильтр по цене (DB stores rubles; price_from=0 means no price data — exclude from range filter)
        if (isset($filters['priceMin']) && $filters['priceMin'] > 0) {
            $query->where('price_to', '>=', (int) $filters['priceMin']);
        }

        if (isset($filters['priceMax']) && $filters['priceMax'] > 0) {
            $query->where('price_from', '>', 0)
                  ->where('price_from', '<=', (int) $filters['priceMax']);
        }
        
        // Фильтр по площади (через предвычисленные min/max)
        if (isset($filters['areaMin']) && $filters['areaMin'] > 0) {
            $query->where('max_area', '>=', $filters['areaMin']);
        }
        
        if (isset($filters['areaMax']) && $filters['areaMax'] > 0) {
            $query->where('min_area', '<=', $filters['areaMax']);
        }
        
        // Фильтр по этажу
        if (isset($filters['floorMin']) && $filters['floorMin'] > 0) {
            $query->where('max_floor', '>=', $filters['floorMin']);
        }
        
        if (isset($filters['floorMax']) && $filters['floorMax'] > 0) {
            $query->where('min_floor', '<=', $filters['floorMax']);
        }
        
        // Фильтр по комнатности (через boolean колонки rooms_0..rooms_4)
        // Cast to int since URL params arrive as strings ("0","1","2"...)
        if (!empty($filters['rooms']) && is_array($filters['rooms'])) {
            $rooms = array_map('intval', $filters['rooms']);
            $validRooms = array_filter($rooms, fn($r) => in_array($r, [0, 1, 2, 3, 4], true));
            if (!empty($validRooms)) {
                $query->where(function ($q) use ($validRooms) {
                    foreach ($validRooms as $room) {
                        $q->orWhere('rooms_' . $room, true);
                    }
                });
            }
        }
        
        // Фильтр по району (frontend sends names)
        if (!empty($filters['district']) && is_array($filters['district'])) {
            $query->whereIn('district_name', $filters['district']);
        }

        // Фильтр по метро — DB stores "Арбатская (3л)", frontend sends "Арбатская (3л)" (same format)
        if (!empty($filters['subway']) && is_array($filters['subway'])) {
            \Illuminate\Support\Facades\Log::debug('[SearchService] subway filter', [
                'raw'  => $filters['subway'],
            ]);
            $query->whereIn('subway_name', $filters['subway']);
        }

        // Фильтр по застройщику — LIKE match (handles minor name differences)
        if (!empty($filters['builder']) && is_array($filters['builder'])) {
            \Illuminate\Support\Facades\Log::debug('[SearchService] builder filter', [
                'raw' => $filters['builder'],
            ]);
            $query->where(function ($q) use ($filters) {
                foreach ($filters['builder'] as $dev) {
                    $q->orWhere('builder_name', 'LIKE', '%' . $dev . '%');
                }
            });
        }
        
        // Фильтр по отделке (через boolean колонки)
        if (!empty($filters['finishing']) && is_array($filters['finishing'])) {
            $query->where(function ($q) use ($filters) {
                foreach ($filters['finishing'] as $finishing) {
                    $finishingColumn = $this->getFinishingColumn($finishing);
                    if ($finishingColumn) {
                        $q->orWhere($finishingColumn, true);
                    }
                }
            });
        }
        
        // Фильтр по сроку сдачи
        if (!empty($filters['deadline']) && is_array($filters['deadline'])) {
            $query->whereIn('deadline', $filters['deadline']);
        }
        
        // Фильтр по статусу
        if (!empty($filters['status']) && is_array($filters['status'])) {
            $query->whereIn('status', $filters['status']);
        }
        
        // Фильтр по границам карты
        if (!empty($filters['bounds'])) {
            $bounds = $filters['bounds'];
            if (isset($bounds['north']) && isset($bounds['south']) && 
                isset($bounds['east']) && isset($bounds['west'])) {
                $query->whereBetween('lat', [$bounds['south'], $bounds['north']])
                    ->whereBetween('lng', [$bounds['west'], $bounds['east']]);
            }
        }
    }
    
    /**
     * Применение сортировки
     */
    private function applySorting($query, array $filters): void
    {
        $sort = $filters['sort'] ?? 'price';
        $order = $filters['order'] ?? 'asc';
        
        switch ($sort) {
            case 'price':
                $query->orderBy('price_from', $order);
                break;
            case 'area':
                $query->orderBy('min_area', $order);
                break;
            case 'name':
                $query->orderBy('name', $order);
                break;
            default:
                $query->orderBy('price_from', 'asc');
        }
    }
    
    /**
     * Форматирование комплекса для ответа
     */
    private function formatComplex($complex, $roomRows = null): array
    {
        $breakdown = [];
        if ($roomRows) {
            foreach ($roomRows as $row) {
                $cat = (int) $row->room_cat;
                if ($cat >= 0 && $cat <= 4) {
                    $breakdown[] = [
                        'rooms'    => $cat,
                        'count'    => (int) $row->cnt,
                        'minPrice' => (int) $row->min_price,
                        'minArea'  => (float) $row->min_area,
                    ];
                }
            }
            usort($breakdown, fn($a, $b) => $a['rooms'] - $b['rooms']);
        }

        return [
            'id' => $complex->complex_id,
            'slug' => $complex->slug,
            'name' => $complex->name,
            'description' => $complex->description,
            'district' => $complex->district_id ? [
                'id' => $complex->district_id,
                'name' => $complex->district_name,
            ] : null,
            'subway' => $complex->subway_id ? [
                'id' => $complex->subway_id,
                'name' => $complex->subway_name,
                'line' => $complex->subway_line,
            ] : null,
            'subwayDistance' => $complex->subway_distance,
            'builder' => $complex->builder_id ? [
                'id'   => $complex->builder_id,
                'name' => $complex->builder_name,
            ] : null,
            'address' => $complex->address,
            'coords' => [
                'lat' => (float) $complex->lat,
                'lng' => (float) $complex->lng,
            ],
            'status' => $complex->status,
            'deadline' => $complex->deadline,
            'priceFrom' => (int) $complex->price_from,
            'priceTo' => (int) $complex->price_to,
            'images' => $this->formatImages($complex->images),
            'advantages' => json_decode($complex->advantages, true) ?? [],
            'infrastructure' => json_decode($complex->infrastructure, true) ?? [],
            'totalAvailableApartments' => (int) $complex->available_apartments,
            'roomsBreakdown' => $breakdown,
        ];
    }
    
    /**
     * Получить название колонки для отделки
     */
    private function getFinishingColumn(string $finishing): ?string
    {
        $map = [
            'без отделки' => 'finishing_bez_otdelki',
            'черновая' => 'finishing_chernovaya',
            'чистовая' => 'finishing_chistovaya',
            'под ключ' => 'finishing_pod_klyuch',
        ];
        
        return $map[$finishing] ?? null;
    }
    
    /**
     * Генерация ключа кэша (включает версию для мгновенной инвалидации)
     */
    private function generateCacheKey(array $filters, int $page, int $perPage): string
    {
        ksort($filters);
        $hash = md5(serialize($filters) . $page . $perPage);
        $ver  = CacheInvalidator::searchVersion();

        return "v{$ver}:search:complexes:{$hash}";
    }
    
    /**
     * Fetch min price, min area, count per room category for a set of complexes (single query)
     */
    private function fetchRoomBreakdown(array $complexIds): \Illuminate\Support\Collection
    {
        if (empty($complexIds)) return collect();

        return DB::table('apartments')
            ->leftJoin('rooms as r', 'r.crm_id', '=', 'apartments.rooms_count')
            ->selectRaw('
                apartments.block_id,
                COALESCE(r.room_category, apartments.rooms_count) AS room_cat,
                COUNT(*) AS cnt,
                MIN(apartments.price) AS min_price,
                MIN(apartments.area_total) AS min_area
            ')
            ->whereIn('apartments.block_id', $complexIds)
            ->where('apartments.is_active', 1)
            ->whereIn('apartments.status', ['available', 'reserved'])
            ->groupBy('apartments.block_id', DB::raw('COALESCE(r.room_category, apartments.rooms_count)'))
            ->get()
            ->groupBy('block_id');
    }

    /**
     * Поиск для карты — с BBOX-фильтрацией, zoom-aware лимитом и версионным кэшем
     */
    public function searchForMap(array $filters): array
    {
        $hasBbox  = !empty($filters['bounds']['north']);
        $ver      = CacheInvalidator::mapVersion();
        $cacheKey = "v{$ver}:map:complexes:" . md5(serialize($filters));

        return Cache::remember($cacheKey, 120, function () use ($filters, $hasBbox) {
            $query = DB::table('complexes_search')
                ->where('status', '!=', 'deleted')
                ->where('available_apartments', '>', 0)
                ->whereNotNull('lat')
                ->whereNotNull('lng')
                ->where('lat', '!=', 0)
                ->where('lng', '!=', 0);

            $this->applyFilters($query, $filters);

            if ($hasBbox) {
                // Zoomed in: return everything inside the viewport (up to 2000 pins)
                $complexes = $query->limit(2000)->get();
            } else {
                // No bbox (zoomed out): return top 500 most active complexes
                // This approximates a zoom-out view without flooding the map
                $complexes = $query
                    ->orderByDesc('available_apartments')
                    ->limit(500)
                    ->get();
            }

            return $complexes->map(fn($c) => [
                'id'        => $c->complex_id,
                'slug'      => $c->slug,
                'name'      => $c->name,
                'coords'    => [(float) $c->lat, (float) $c->lng],
                'images'    => $this->formatImages($c->images),
                'priceFrom' => (int) $c->price_from,
                'district'  => $c->district_name,
                'subway'    => $c->subway_name,
                'builder'   => $c->builder_name,
                'available' => (int) $c->available_apartments,
            ])->toArray();
        });
    }
}

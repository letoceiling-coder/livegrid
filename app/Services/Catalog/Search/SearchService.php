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
        $complexIdsQuery = DB::table('complexes_search')
            ->where('status', '!=', 'deleted')
            ->where('available_apartments', '>', 0)
            ->select('complex_id');
        $this->applyFilters($complexIdsQuery, $filters);

        $apartmentsQuery = DB::table('apartments_search as aps')
            ->whereIn('aps.block_id', $complexIdsQuery)
            ->where('aps.is_active', 1)
            ->whereIn('aps.status', ['available', 'reserved']);

        if (isset($filters['priceMin']) && (int) $filters['priceMin'] > 0) {
            $apartmentsQuery->where('aps.price', '>=', (int) $filters['priceMin']);
        }
        if (isset($filters['priceMax']) && (int) $filters['priceMax'] > 0) {
            $apartmentsQuery->where('aps.price', '>=', 100000)
                ->where('aps.price', '<=', (int) $filters['priceMax']);
        }
        if (isset($filters['areaMin']) && (float) $filters['areaMin'] > 0) {
            $apartmentsQuery->where('aps.area_total', '>=', (float) $filters['areaMin']);
        }
        if (isset($filters['areaMax']) && (float) $filters['areaMax'] > 0) {
            $apartmentsQuery->where('aps.area_total', '<=', (float) $filters['areaMax']);
        }

        if (!empty($filters['rooms']) && is_array($filters['rooms'])) {
            $rooms = array_values(array_unique(array_filter(array_map('intval', $filters['rooms']), fn (int $r) => in_array($r, [0, 1, 2, 3, 4], true))));
            if ($rooms !== []) {
                $apartmentsQuery->where(function ($q) use ($rooms) {
                    foreach ($rooms as $room) {
                        if ($room === 4) {
                            $q->orWhere('aps.rooms_count', '>=', 4);
                        } else {
                            $q->orWhere('aps.rooms_count', '=', $room);
                        }
                    }
                });
            }
        }

        if (!empty($filters['wc']) && is_array($filters['wc'])) {
            $wc = array_values(array_unique(array_filter(array_map('intval', $filters['wc']), fn (int $v) => $v >= 1)));
            if ($wc !== []) {
                $apartmentsQuery->where(function ($q) use ($wc) {
                    foreach ($wc as $minWc) {
                        $q->orWhere('aps.wc_count', '>=', $minWc);
                    }
                });
            }
        }

        if (isset($filters['ceilingHeightMin']) && (float) $filters['ceilingHeightMin'] > 0) {
            $apartmentsQuery->whereNotNull('aps.height')->where('aps.height', '>=', (float) $filters['ceilingHeightMin']);
        }
        if (isset($filters['ceilingHeightMax']) && (float) $filters['ceilingHeightMax'] > 0) {
            $apartmentsQuery->whereNotNull('aps.height')->where('aps.height', '<=', (float) $filters['ceilingHeightMax']);
        }

        if (isset($filters['floorMin']) && (int) $filters['floorMin'] > 0) {
            $apartmentsQuery->where('aps.floor', '>=', (int) $filters['floorMin']);
        }
        if (isset($filters['floorMax']) && (int) $filters['floorMax'] > 0) {
            $apartmentsQuery->where('aps.floor', '<=', (int) $filters['floorMax']);
        }
        if (!empty($filters['notFirstFloor'])) {
            $apartmentsQuery->where('aps.floor', '>', 1);
        }
        if (!empty($filters['notLastFloor'])) {
            $apartmentsQuery->whereColumn('aps.floor', '<', 'aps.floors');
        }
        if (!empty($filters['highFloor'])) {
            $apartmentsQuery->where('aps.floor', '>', 10);
        }

        if (!empty($filters['deadline']) && is_array($filters['deadline'])) {
            $values = array_values(array_unique(array_filter(array_map(
                static fn ($v) => is_string($v) ? trim($v) : (string) $v,
                $filters['deadline']
            ), static fn ($v) => $v !== '')));

            if ($values !== []) {
                $years = array_values(array_filter($values, static fn ($v) => preg_match('/^\d{4}$/', $v) === 1));
                $exact = array_values(array_filter($values, static fn ($v) => preg_match('/^\d{4}$/', $v) !== 1 && mb_strtolower($v) !== 'сдан'));

                if ($years !== [] || $exact !== []) {
                    $apartmentsQuery->where(function ($q) use ($years, $exact) {
                        foreach ($years as $year) {
                            $q->orWhere('aps.deadline', 'LIKE', $year . '%');
                        }
                        if ($exact !== []) {
                            $q->orWhereIn('aps.deadline', $exact);
                        }
                    });
                }
            }
        }

        if (
            (isset($filters['livingAreaMin']) && (float) $filters['livingAreaMin'] > 0) ||
            (isset($filters['livingAreaMax']) && (float) $filters['livingAreaMax'] > 0) ||
            !empty($filters['hasPlan'])
        ) {
            $apartmentsQuery->whereExists(function ($sq) use ($filters) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.id', 'aps.id');

                if (isset($filters['livingAreaMin']) && (float) $filters['livingAreaMin'] > 0) {
                    $sq->where('ap.area_rooms_total', '>=', (float) $filters['livingAreaMin']);
                }
                if (isset($filters['livingAreaMax']) && (float) $filters['livingAreaMax'] > 0) {
                    $sq->where('ap.area_rooms_total', '<=', (float) $filters['livingAreaMax']);
                }
                if (!empty($filters['hasPlan'])) {
                    $sq->whereNotNull('ap.plan_image')->where('ap.plan_image', '!=', '');
                }
            });
        }

        $complexes = (int) (clone $apartmentsQuery)->distinct('aps.block_id')->count('aps.block_id');
        $apartments = (int) (clone $apartmentsQuery)->count('aps.id');

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
        $structuredSubwayNames = [];
        if (!empty($filters['subway']) && is_array($filters['subway'])) {
            $structuredSubwayNames = array_values(array_unique(array_filter(array_map(
                static fn ($n) => is_string($n) ? trim($n) : '',
                $filters['subway']
            ))));
        }

        // Текстовый поиск — LIKE по 5 полям. Не комбинируем с фильтром metro[]: там LIKE по
        // subway_name (только ближайшая станция) и AND обнулял выдачу при search+subway из URL.
        if (!empty($filters['search']) && $structuredSubwayNames === []) {
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
            // Exclude obviously broken low prices from feed noise.
            $query->where('price_from', '>=', 100000)
                  ->where('price_from', '<=', (int) $filters['priceMax']);
        }
        
        // Фильтр по площади (через предвычисленные min/max)
        if (isset($filters['areaMin']) && $filters['areaMin'] > 0) {
            $query->where('max_area', '>=', $filters['areaMin']);
        }
        
        if (isset($filters['areaMax']) && $filters['areaMax'] > 0) {
            $query->where('min_area', '<=', $filters['areaMax']);
        }

        if (
            (isset($filters['livingAreaMin']) && $filters['livingAreaMin'] > 0) ||
            (isset($filters['livingAreaMax']) && $filters['livingAreaMax'] > 0)
        ) {
            $minLiving = isset($filters['livingAreaMin']) ? (float) $filters['livingAreaMin'] : null;
            $maxLiving = isset($filters['livingAreaMax']) ? (float) $filters['livingAreaMax'] : null;

            $query->whereExists(function ($sq) use ($minLiving, $maxLiving) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.block_id', 'complexes_search.complex_id')
                    ->where('ap.is_active', 1)
                    ->whereIn('ap.status', ['available', 'reserved'])
                    ->whereNotNull('ap.area_rooms_total');

                if ($minLiving !== null) {
                    $sq->where('ap.area_rooms_total', '>=', $minLiving);
                }
                if ($maxLiving !== null) {
                    $sq->where('ap.area_rooms_total', '<=', $maxLiving);
                }
            });
        }
        
        // Фильтр по этажу
        if (isset($filters['floorMin']) && $filters['floorMin'] > 0) {
            $query->where('max_floor', '>=', $filters['floorMin']);
        }
        
        if (isset($filters['floorMax']) && $filters['floorMax'] > 0) {
            $query->where('min_floor', '<=', $filters['floorMax']);
        }

        if (!empty($filters['notFirstFloor'])) {
            $query->whereExists(function ($sq) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.block_id', 'complexes_search.complex_id')
                    ->where('ap.is_active', 1)
                    ->whereIn('ap.status', ['available', 'reserved'])
                    ->where('ap.floor', '>', 1);
            });
        }

        if (!empty($filters['notLastFloor'])) {
            $query->whereExists(function ($sq) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.block_id', 'complexes_search.complex_id')
                    ->where('ap.is_active', 1)
                    ->whereIn('ap.status', ['available', 'reserved'])
                    ->whereColumn('ap.floor', '<', 'ap.floors');
            });
        }

        if (!empty($filters['highFloor'])) {
            $query->whereExists(function ($sq) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.block_id', 'complexes_search.complex_id')
                    ->where('ap.is_active', 1)
                    ->whereIn('ap.status', ['available', 'reserved'])
                    ->where('ap.floor', '>', 10);
            });
        }

        if (!empty($filters['hasPlan'])) {
            $query->whereExists(function ($sq) {
                $sq->select(DB::raw(1))
                    ->from('apartments as ap')
                    ->whereColumn('ap.block_id', 'complexes_search.complex_id')
                    ->where('ap.is_active', 1)
                    ->whereIn('ap.status', ['available', 'reserved'])
                    ->whereNotNull('ap.plan_image')
                    ->where('ap.plan_image', '!=', '');
            });
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

        // Фильтр по числу санузлов и высоте потолка на уровне квартир.
        if (!empty($filters['wc']) && is_array($filters['wc'])) {
            $wc = array_values(array_unique(array_filter(array_map('intval', $filters['wc']), fn (int $v) => $v >= 1)));
            if ($wc !== []) {
                $query->whereExists(function ($sq) use ($wc) {
                    $sq->select(DB::raw(1))
                        ->from('apartments_search as aps')
                        ->whereColumn('aps.block_id', 'complexes_search.complex_id')
                        ->where('aps.is_active', 1)
                        ->whereIn('aps.status', ['available', 'reserved'])
                        ->where(function ($wq) use ($wc) {
                            foreach ($wc as $i => $minWc) {
                                if ($i === 0) {
                                    $wq->where('aps.wc_count', '>=', $minWc);
                                } else {
                                    $wq->orWhere('aps.wc_count', '>=', $minWc);
                                }
                            }
                        });
                });
            }
        }

        if (
            (isset($filters['ceilingHeightMin']) && $filters['ceilingHeightMin'] > 0) ||
            (isset($filters['ceilingHeightMax']) && $filters['ceilingHeightMax'] > 0)
        ) {
            $min = isset($filters['ceilingHeightMin']) ? (float) $filters['ceilingHeightMin'] : null;
            $max = isset($filters['ceilingHeightMax']) ? (float) $filters['ceilingHeightMax'] : null;

            $query->whereExists(function ($sq) use ($min, $max) {
                $sq->select(DB::raw(1))
                    ->from('apartments_search as aps')
                    ->whereColumn('aps.block_id', 'complexes_search.complex_id')
                    ->where('aps.is_active', 1)
                    ->whereIn('aps.status', ['available', 'reserved'])
                    ->whereNotNull('aps.height');

                if ($min !== null) {
                    $sq->where('aps.height', '>=', $min);
                }
                if ($max !== null) {
                    $sq->where('aps.height', '<=', $max);
                }
            });
        }
        
        // Фильтр по району (frontend sends names)
        if (!empty($filters['district']) && is_array($filters['district'])) {
            $query->whereIn('district_name', $filters['district']);
        }

        // Фильтр по метро: любая станция из block_subway (как у донора). complexes_search.subway_name —
        // только ближайшая станция, из‑за этого whereIn(subway_name) давал 0 результатов.
        if ($structuredSubwayNames !== []) {
            $query->whereExists(function ($sq) use ($structuredSubwayNames) {
                $sq->select(DB::raw(1))
                    ->from('block_subway as bs')
                    ->join('subways as sw', 'sw.id', '=', 'bs.subway_id')
                    ->whereColumn('bs.block_id', 'complexes_search.complex_id')
                    ->whereIn('sw.name', $structuredSubwayNames);
            });
        }

        if (isset($filters['subwayTimeMax']) && in_array((int) $filters['subwayTimeMax'], [5, 10, 15], true)) {
            $maxTime = (int) $filters['subwayTimeMax'];
            $query->whereExists(function ($sq) use ($maxTime) {
                $sq->select(DB::raw(1))
                    ->from('block_subway as bs')
                    ->whereColumn('bs.block_id', 'complexes_search.complex_id')
                    ->where('bs.distance_time', '<=', $maxTime);
            });
        }

        if (!empty($filters['subwayDistanceType']) && is_array($filters['subwayDistanceType'])) {
            $types = array_values(array_unique(array_filter(array_map('intval', $filters['subwayDistanceType']), fn (int $t) => in_array($t, [1, 2], true))));
            if ($types !== []) {
                $query->whereExists(function ($sq) use ($types) {
                    $sq->select(DB::raw(1))
                        ->from('block_subway as bs')
                        ->whereColumn('bs.block_id', 'complexes_search.complex_id')
                        ->whereIn('bs.distance_type', $types);
                });
            }
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

        if (!empty($filters['buildingType']) && is_array($filters['buildingType'])) {
            $types = array_values(array_filter(array_map('trim', $filters['buildingType']), fn ($v) => $v !== ''));
            if ($types !== []) {
                $query->whereExists(function ($sq) use ($types) {
                    $sq->select(DB::raw(1))
                        ->from('buildings as b')
                        ->join('building_types as bt', 'bt.id', '=', 'b.building_type_id')
                        ->whereColumn('b.block_id', 'complexes_search.complex_id')
                        ->whereIn('bt.name', $types);
                });
            }
        }

        if (!empty($filters['queue']) && is_array($filters['queue'])) {
            $queues = array_values(array_filter(array_map('trim', $filters['queue']), fn ($v) => $v !== ''));
            if ($queues !== []) {
                $query->whereExists(function ($sq) use ($queues) {
                    $sq->select(DB::raw(1))
                        ->from('buildings as b')
                        ->whereColumn('b.block_id', 'complexes_search.complex_id')
                        ->whereIn('b.queue', $queues);
                });
            }
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
        
        // Фильтр по сроку сдачи.
        // UI карты/каталога отдаёт упрощённые значения (например, "2025", "2026", "Сдан"),
        // а в базе `complexes_search.deadline` хранит более детальные строки (например "2025 Q4").
        // Поэтому поддерживаем:
        // - год: deadline LIKE "2025%"
        // - конкретное значение: deadline IN (...)
        // - "Сдан": status = completed
        if (!empty($filters['deadline']) && is_array($filters['deadline'])) {
            $values = array_values(array_unique(array_filter(array_map(
                static fn ($v) => is_string($v) ? trim($v) : (string) $v,
                $filters['deadline']
            ), static fn ($v) => $v !== '')));

            if ($values !== []) {
                $years = array_values(array_filter($values, static fn ($v) => preg_match('/^\d{4}$/', $v) === 1));
                $specialCompleted = in_array('Сдан', $values, true) || in_array('сдан', $values, true);
                $exact = array_values(array_filter($values, static fn ($v) => preg_match('/^\d{4}$/', $v) !== 1 && mb_strtolower($v) !== 'сдан'));

                $query->where(function ($q) use ($years, $exact, $specialCompleted) {
                    foreach ($years as $year) {
                        $q->orWhere('deadline', 'LIKE', $year . '%');
                    }
                    if ($exact !== []) {
                        $q->orWhereIn('deadline', $exact);
                    }
                    if ($specialCompleted) {
                        $q->orWhere('status', '=', 'completed');
                    }
                });
            }
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
        $sort = $filters['sort'] ?? 'price_asc';
        $order = $filters['order'] ?? 'asc';
        
        switch ($sort) {
            case 'price_asc':
                $query->orderBy('price_from', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price_from', 'desc');
                break;
            case 'price_per_m2_asc':
                $query->orderByRaw('(price_from / NULLIF(min_area, 0)) ASC');
                break;
            case 'price_per_m2_desc':
                $query->orderByRaw('(price_from / NULLIF(min_area, 0)) DESC');
                break;
            case 'area_desc':
                $query->orderBy('max_area', 'desc');
                break;
            case 'deadline_asc':
                $query->orderBy('deadline', 'asc');
                break;
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

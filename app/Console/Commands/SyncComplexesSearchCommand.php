<?php

namespace App\Console\Commands;

use App\Services\CacheInvalidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SyncComplexesSearchCommand extends Command
{
    protected $signature = 'complexes:sync-search {--truncate : Truncate table before sync}';
    protected $description = 'Синхронизация таблицы complexes_search (SQL-based, chunked, memory-safe)';

    private const CHUNK_SIZE = 100;
    private const VALID_STATUSES = ['building', 'completed', 'planned', 'selling'];

    public function handle(): int
    {
        $startTime = microtime(true);
        $this->info('Начало синхронизации complexes_search...');

        if ($this->option('truncate')) {
            DB::table('complexes_search')->truncate();
            $this->info('Таблица очищена.');
        }

        $total = DB::table('blocks')->count();
        $bar   = $this->output->createProgressBar($total);
        $bar->start();

        $synced = 0;
        $errors = 0;

        DB::table('blocks')
            ->select(['id', 'name', 'slug', 'description', 'district_id', 'builder_id',
                      'lat', 'lng', 'address', 'status', 'deadline',
                      'images', 'advantages', 'infrastructure'])
            ->orderBy('id')
            ->chunk(self::CHUNK_SIZE, function ($complexes) use ($bar, &$synced, &$errors) {
                $ids = $complexes->pluck('id')->toArray();

                // --- Apartment aggregates (single batched query) ---
                // Join rooms table to map crm_id → room_category (0=studio,1=1-room,...,4=4+)
                $apStats = DB::table('apartments')
                    ->leftJoin('rooms', 'rooms.crm_id', '=', 'apartments.rooms_count')
                    ->selectRaw('
                        apartments.block_id,
                        MIN(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.price END)                      AS price_from,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.price END)                      AS price_to,
                        COUNT(DISTINCT apartments.id)                                                                                                          AS total,
                        COUNT(DISTINCT CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.id END)              AS available,
                        MIN(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.area_total END)                AS min_area,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.area_total END)                AS max_area,
                        MIN(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.floor END)                     AS min_floor,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") THEN apartments.floor END)                     AS max_floor,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") AND COALESCE(rooms.room_category, apartments.rooms_count)=0 THEN 1 ELSE 0 END) AS rooms_0,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") AND COALESCE(rooms.room_category, apartments.rooms_count)=1 THEN 1 ELSE 0 END) AS rooms_1,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") AND COALESCE(rooms.room_category, apartments.rooms_count)=2 THEN 1 ELSE 0 END) AS rooms_2,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") AND COALESCE(rooms.room_category, apartments.rooms_count)=3 THEN 1 ELSE 0 END) AS rooms_3,
                        MAX(CASE WHEN apartments.is_active=1 AND apartments.status IN ("available","reserved") AND COALESCE(rooms.room_category, apartments.rooms_count)>=4 THEN 1 ELSE 0 END) AS rooms_4
                    ')
                    ->whereIn('apartments.block_id', $ids)
                    ->groupBy('apartments.block_id')
                    ->get()
                    ->keyBy('block_id');

                // --- Finishing types per complex (single batched query) ---
                $finishingData = DB::table('apartments')
                    ->join('finishings', 'finishings.id', '=', 'apartments.finishing_id')
                    ->selectRaw('apartments.block_id, finishings.name AS finishing_name')
                    ->whereIn('apartments.block_id', $ids)
                    ->where('apartments.is_active', 1)
                    ->whereIn('apartments.status', ['available', 'reserved'])
                    ->whereNotNull('apartments.finishing_id')
                    ->distinct()
                    ->get()
                    ->groupBy('block_id');

                // --- Districts (single batched query) ---
                $districtIds = $complexes->pluck('district_id')->filter()->unique()->values()->toArray();
                $districts = $districtIds
                    ? DB::table('regions')->whereIn('id', $districtIds)->get()->keyBy('id')
                    : collect();

                // --- Builders (single batched query) ---
                $builderIds = $complexes->pluck('builder_id')->filter()->unique()->values()->toArray();
                $builders = $builderIds
                    ? DB::table('builders')->whereIn('id', $builderIds)->get()->keyBy('id')
                    : collect();

                // --- Nearest subway per complex (single batched query) ---
                $subwayRows = DB::table('block_subway')
                    ->join('subways', 'subways.id', '=', 'block_subway.subway_id')
                    ->selectRaw('block_subway.block_id, subways.id AS subway_id, subways.name AS subway_name, subways.line AS subway_line, block_subway.distance_time')
                    ->whereIn('block_subway.block_id', $ids)
                    ->orderBy('block_subway.distance_time')
                    ->get()
                    ->groupBy('block_id')
                    ->map(fn($rows) => $rows->first());

                // --- Build and upsert rows ---
                foreach ($complexes as $complex) {
                    try {
                        $stats     = $apStats->get($complex->id);
                        $fNames    = $finishingData->get($complex->id, collect())->pluck('finishing_name')->toArray();
                        $district  = $districts->get($complex->district_id);
                        $builder   = $builders->get($complex->builder_id);
                        $subway    = $subwayRows->get($complex->id);

                        $status = in_array($complex->status, self::VALID_STATUSES)
                            ? $complex->status
                            : 'building';

                        // Slug fallback: use UUID if slug is empty
                        $slug = $complex->slug ?: Str::slug($complex->name);
                        if (!$slug) {
                            $slug = $complex->id;
                        }

                        DB::table('complexes_search')->updateOrInsert(
                            ['complex_id' => $complex->id],
                            [
                                'name'                    => $complex->name,
                                'slug'                    => $slug,
                                'description'             => $complex->description,
                                'district_id'             => $complex->district_id,
                                'district_name'           => $district?->name,
                                'builder_id'              => $complex->builder_id,
                                'builder_name'            => $builder?->name,
                                'subway_id'               => $subway?->subway_id,
                                'subway_name'             => $subway?->subway_name,
                                'subway_line'             => $subway?->subway_line,
                                'subway_distance'         => $subway ? ($subway->distance_time . ' мин') : null,
                                'lat'                     => $complex->lat,
                                'lng'                     => $complex->lng,
                                'address'                 => $complex->address,
                                'status'                  => $status,
                                'deadline'                => $complex->deadline,
                                'price_from'              => (int) ($stats?->price_from ?? 0),
                                'price_to'                => (int) ($stats?->price_to ?? 0),
                                'total_apartments'        => (int) ($stats?->total ?? 0),
                                'available_apartments'    => (int) ($stats?->available ?? 0),
                                'min_area'                => $stats?->min_area,
                                'max_area'                => $stats?->max_area,
                                'min_floor'               => $stats?->min_floor,
                                'max_floor'               => $stats?->max_floor,
                                'rooms_0'                 => (bool) ($stats?->rooms_0 ?? false),
                                'rooms_1'                 => (bool) ($stats?->rooms_1 ?? false),
                                'rooms_2'                 => (bool) ($stats?->rooms_2 ?? false),
                                'rooms_3'                 => (bool) ($stats?->rooms_3 ?? false),
                                'rooms_4'                 => (bool) ($stats?->rooms_4 ?? false),
                                'finishing_bez_otdelki'   => in_array('без отделки', $fNames),
                                'finishing_chernovaya'    => in_array('черновая', $fNames),
                                'finishing_chistovaya'    => in_array('чистовая', $fNames),
                                'finishing_pod_klyuch'    => in_array('под ключ', $fNames),
                                'images'                  => is_string($complex->images) ? $complex->images : json_encode($complex->images ?? []),
                                'advantages'              => is_string($complex->advantages) ? $complex->advantages : json_encode($complex->advantages ?? []),
                                'infrastructure'          => is_string($complex->infrastructure) ? $complex->infrastructure : json_encode($complex->infrastructure ?? []),
                                'updated_at'              => now(),
                            ]
                        );
                        $synced++;
                    } catch (\Throwable $e) {
                        $errors++;
                        Log::warning('complexes_search sync: failed for complex', [
                            'complex_id' => $complex->id,
                            'name'       => $complex->name,
                            'error'      => $e->getMessage(),
                        ]);
                    }

                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine();

        // Delete stale records (old integer IDs or deleted complexes)
        $deleted = DB::table('complexes_search')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('blocks')->whereColumn('blocks.id', 'complexes_search.complex_id');
            })
            ->delete();

        if ($deleted > 0) {
            $this->info("Удалено устаревших записей: {$deleted}");
        }

        // Invalidate all search/map/reference caches (versioned — no flush of sessions)
        CacheInvalidator::all();

        $elapsed = round(microtime(true) - $startTime, 1);
        $this->info("Готово за {$elapsed}s. Синхронизировано: {$synced}, Ошибок: {$errors}");

        Log::info('complexes_search sync completed', [
            'synced'  => $synced,
            'errors'  => $errors,
            'deleted' => $deleted,
            'elapsed' => $elapsed,
        ]);

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}

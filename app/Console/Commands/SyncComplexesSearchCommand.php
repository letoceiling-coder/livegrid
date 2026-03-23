<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Catalog\Complex;

class SyncComplexesSearchCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'complexes:sync-search';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Синхронизация таблицы complexes_search с данными из blocks и apartments';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Начало синхронизации complexes_search...');
        
        $complexes = Complex::with(['district', 'builder', 'subways', 'apartments'])->get();
        $bar = $this->output->createProgressBar($complexes->count());
        $bar->start();
        
        foreach ($complexes as $complex) {
            $this->syncComplex($complex);
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        $this->info('Синхронизация завершена!');
        
        return Command::SUCCESS;
    }
    
    private function syncComplex(Complex $complex): void
    {
        // Получить ближайшее метро
        $subway = $complex->subways()->first();
        
        // Вычислить агрегаты из apartments
        $apartments = $complex->apartments()
            ->where('is_active', 1)
            ->whereIn('status', ['available', 'reserved'])
            ->get();
        
        $priceFrom = $apartments->min('price') ?? 0;
        $priceTo = $apartments->max('price') ?? 0;
        $totalApartments = $complex->apartments()->count();
        $availableApartments = $apartments->count();
        
        $minArea = $apartments->min('area_total');
        $maxArea = $apartments->max('area_total');
        $minFloor = $apartments->min('floor');
        $maxFloor = $apartments->max('floor');
        
        // Определить доступные комнатности
        $availableRooms = $apartments->pluck('rooms_count')->unique()->toArray();
        $rooms0 = in_array(0, $availableRooms);
        $rooms1 = in_array(1, $availableRooms);
        $rooms2 = in_array(2, $availableRooms);
        $rooms3 = in_array(3, $availableRooms);
        $rooms4 = in_array(4, $availableRooms) || $apartments->where('rooms_count', '>=', 4)->isNotEmpty();
        
        // Определить доступные отделки
        $finishings = $apartments->pluck('finishing_id')
            ->filter()
            ->unique()
            ->map(function ($finishingId) {
                return DB::table('finishings')->where('id', $finishingId)->value('name');
            })
            ->filter()
            ->toArray();
        
        $finishingBezOtdelki = in_array('без отделки', $finishings);
        $finishingChernovaya = in_array('черновая', $finishings);
        $finishingChistovaya = in_array('чистовая', $finishings);
        $finishingPodKlyuch = in_array('под ключ', $finishings);
        
        // Вставить или обновить запись
        DB::table('complexes_search')->updateOrInsert(
            ['complex_id' => $complex->id],
            [
                'name' => $complex->name,
                'slug' => $complex->slug ?? Str::slug($complex->name),
                'description' => $complex->description,
                'district_id' => $complex->district_id ?? '',
                'district_name' => $complex->district?->name ?? '',
                'builder_id' => $complex->builder_id,
                'builder_name' => $complex->builder ? $complex->builder->name : null,
                'subway_id' => $subway ? $subway->id : null,
                'subway_name' => $subway ? $subway->name : null,
                'subway_line' => $subway ? $subway->line : null,
                'subway_distance' => $subway ? ($subway->pivot->distance_time ?? null) . ' мин' : null,
                'lat' => $complex->lat,
                'lng' => $complex->lng,
                'address' => $complex->address,
                'status' => $complex->status ?? 'building',
                'deadline' => $complex->deadline,
                'price_from' => $priceFrom,
                'price_to' => $priceTo,
                'total_apartments' => $totalApartments,
                'available_apartments' => $availableApartments,
                'min_area' => $minArea,
                'max_area' => $maxArea,
                'min_floor' => $minFloor,
                'max_floor' => $maxFloor,
                'rooms_0' => $rooms0,
                'rooms_1' => $rooms1,
                'rooms_2' => $rooms2,
                'rooms_3' => $rooms3,
                'rooms_4' => $rooms4,
                'finishing_bez_otdelki' => $finishingBezOtdelki,
                'finishing_chernovaya' => $finishingChernovaya,
                'finishing_chistovaya' => $finishingChistovaya,
                'finishing_pod_klyuch' => $finishingPodKlyuch,
                'images' => json_encode($complex->images ?? []),
                'advantages' => json_encode($complex->advantages ?? []),
                'infrastructure' => json_encode($complex->infrastructure ?? []),
                'updated_at' => now(),
            ]
        );
    }
}

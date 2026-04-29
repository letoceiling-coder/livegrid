<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Region;
use App\Models\Catalog\Subway;
use App\Models\Catalog\Builder;
use App\Models\Catalog\Finishing;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReferenceController extends Controller
{
    /**
     * Unified filters endpoint — all reference data in one request
     */
    public function filters(): JsonResponse
    {
        $districts = Cache::remember('references:districts', 3600, fn () =>
            Region::orderBy('name')->get()->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])
        );

        $subways = Cache::remember('references:subways', 3600, fn () =>
            Subway::orderBy('name')->get()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'line' => $s->line ?? null])
        );

        $builders = Cache::remember('references:builders', 3600, fn () =>
            Builder::orderBy('name')->get()->map(fn ($b) => ['id' => $b->id, 'name' => $b->name])
        );

        $finishings = Cache::remember('references:finishings', 3600, fn () =>
            Finishing::orderBy('name')->get()->map(fn ($f) => ['value' => $f->name, 'label' => $f->name])
        );

        $buildingTypes = Cache::remember('references:building-types', 3600, fn () =>
            DB::table('building_types')->orderBy('name')->get()->map(fn ($t) => ['id' => $t->id, 'name' => $t->name])
        );

        $queues = Cache::remember('references:queues', 3600, fn () =>
            DB::table('buildings')
                ->whereNotNull('queue')
                ->where('queue', '!=', '')
                ->distinct()
                ->orderBy('queue')
                ->pluck('queue')
                ->values()
                ->all()
        );

        $wcOptions = Cache::remember('references:wc-options', 3600, function () {
            if (!DB::getSchemaBuilder()->hasTable('apartments_search')) {
                return [1, 2, 3];
            }

            return DB::table('apartments_search')
                ->whereNotNull('wc_count')
                ->where('wc_count', '>=', 1)
                ->distinct()
                ->orderBy('wc_count')
                ->limit(5)
                ->pluck('wc_count')
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();
        });

        $ceilingHeight = Cache::remember('references:ceiling-height', 3600, function () {
            if (!DB::getSchemaBuilder()->hasTable('apartments_search')) {
                return ['min' => null, 'max' => null];
            }

            $row = DB::table('apartments_search')
                ->whereNotNull('height')
                ->selectRaw('MIN(height) as min_height, MAX(height) as max_height')
                ->first();

            return [
                'min' => $row && $row->min_height !== null ? round((float) $row->min_height, 1) : null,
                'max' => $row && $row->max_height !== null ? round((float) $row->max_height, 1) : null,
            ];
        });

        return response()->json([
            'districts' => $districts,
            'subways'   => $subways,
            'builders'  => $builders,
            'finishings' => $finishings,
            'buildingTypes' => $buildingTypes,
            'queues' => $queues,
            'wcOptions' => $wcOptions,
            'ceilingHeight' => $ceilingHeight,
        ]);
    }

    /**
     * Справочник районов
     */
    public function districts(): JsonResponse
    {
        $districts = Cache::remember('references:districts', 3600, function () {
            return Region::orderBy('name')->get();
        });
        
        return response()->json([
            'data' => $districts->map(function ($district) {
                return [
                    'id' => $district->id,
                    'name' => $district->name,
                ];
            }),
        ]);
    }
    
    /**
     * Справочник станций метро
     */
    public function subways(): JsonResponse
    {
        $subways = Cache::remember('references:subways', 3600, function () {
            return Subway::orderBy('name')->get();
        });
        
        return response()->json([
            'data' => $subways->map(function ($subway) {
                return [
                    'id' => $subway->id,
                    'name' => $subway->name,
                    'line' => $subway->line,
                ];
            }),
        ]);
    }
    
    /**
     * Справочник застройщиков
     */
    public function builders(): JsonResponse
    {
        $builders = Cache::remember('references:builders', 3600, function () {
            return Builder::orderBy('name')->get();
        });
        
        return response()->json([
            'data' => $builders->map(function ($builder) {
                return [
                    'id' => $builder->id,
                    'name' => $builder->name,
                ];
            }),
        ]);
    }
    
    /**
     * Справочник типов отделки
     */
    public function finishings(): JsonResponse
    {
        $finishings = Cache::remember('references:finishings', 3600, function () {
            return Finishing::orderBy('name')->get();
        });
        
        return response()->json([
            'data' => $finishings->map(function ($finishing) {
                return [
                    'value' => $finishing->name,
                    'label' => $finishing->name,
                ];
            }),
        ]);
    }
}

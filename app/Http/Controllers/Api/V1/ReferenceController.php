<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Region;
use App\Models\Catalog\Subway;
use App\Models\Catalog\Builder;
use App\Models\Catalog\Finishing;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

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

        return response()->json([
            'districts' => $districts,
            'subways'   => $subways,
            'builders'  => $builders,
            'finishings' => $finishings,
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

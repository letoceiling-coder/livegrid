<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\District;
use App\Models\Catalog\Subway;
use App\Models\Catalog\Builder;
use App\Models\Catalog\Finishing;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ReferenceController extends Controller
{
    /**
     * Справочник районов
     */
    public function districts(): JsonResponse
    {
        $districts = Cache::remember('references:districts', 3600, function () {
            return District::orderBy('name')->get();
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

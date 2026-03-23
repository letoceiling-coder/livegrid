<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchComplexesRequest;
use App\Services\Catalog\Search\SearchService;
use Illuminate\Http\JsonResponse;

class MapController extends Controller
{
    public function __construct(
        private SearchService $searchService
    ) {}

    /**
     * Получить комплексы для карты
     */
    public function complexes(SearchComplexesRequest $request): JsonResponse
    {
        $filters = $this->extractFilters($request);
        
        $complexes = $this->searchService->searchForMap($filters);
        
        return response()->json([
            'data' => $complexes,
        ]);
    }
    
    /**
     * Извлечение фильтров из запроса
     */
    private function extractFilters(SearchComplexesRequest $request): array
    {
        $filters = [];
        
        if ($request->has('search')) {
            $filters['search'] = $request->input('search');
        }
        
        if ($request->has('rooms')) {
            $filters['rooms'] = $request->input('rooms');
        }
        
        if ($request->has('priceMin')) {
            $filters['priceMin'] = (int) $request->input('priceMin');
        }
        
        if ($request->has('priceMax')) {
            $filters['priceMax'] = (int) $request->input('priceMax');
        }
        
        if ($request->has('areaMin')) {
            $filters['areaMin'] = (float) $request->input('areaMin');
        }
        
        if ($request->has('areaMax')) {
            $filters['areaMax'] = (float) $request->input('areaMax');
        }
        
        if ($request->has('district')) {
            $filters['district'] = $request->input('district');
        }
        
        if ($request->has('subway')) {
            $filters['subway'] = $request->input('subway');
        }
        
        if ($request->has('builder')) {
            $filters['builder'] = $request->input('builder');
        }
        
        if ($request->has('finishing')) {
            $filters['finishing'] = $request->input('finishing');
        }
        
        if ($request->has('deadline')) {
            $filters['deadline'] = $request->input('deadline');
        }
        
        if ($request->has('status')) {
            $filters['status'] = $request->input('status');
        }
        
        if ($request->has('bounds')) {
            $filters['bounds'] = $request->input('bounds');
        }
        
        return $filters;
    }
}

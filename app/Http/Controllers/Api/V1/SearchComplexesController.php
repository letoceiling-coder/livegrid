<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchComplexesRequest;
use App\Services\Catalog\Search\SearchService;
use Illuminate\Http\JsonResponse;

class SearchComplexesController extends Controller
{
    public function __construct(
        private SearchService $searchService
    ) {}

    /**
     * Поиск комплексов
     */
    public function index(SearchComplexesRequest $request): JsonResponse
    {
        $filters = $this->extractFilters($request);
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('perPage', 20);
        
        $result = $this->searchService->searchComplexes($filters, $page, $perPage);
        
        return response()->json($result);
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

        if ($request->has('wc')) {
            $filters['wc'] = $request->input('wc');
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
        if ($request->has('livingAreaMin')) {
            $filters['livingAreaMin'] = (float) $request->input('livingAreaMin');
        }
        if ($request->has('livingAreaMax')) {
            $filters['livingAreaMax'] = (float) $request->input('livingAreaMax');
        }

        if ($request->has('ceilingHeightMin')) {
            $filters['ceilingHeightMin'] = (float) $request->input('ceilingHeightMin');
        }

        if ($request->has('ceilingHeightMax')) {
            $filters['ceilingHeightMax'] = (float) $request->input('ceilingHeightMax');
        }
        
        if ($request->has('floorMin')) {
            $filters['floorMin'] = (int) $request->input('floorMin');
        }
        
        if ($request->has('floorMax')) {
            $filters['floorMax'] = (int) $request->input('floorMax');
        }
        if ($request->boolean('notFirstFloor')) {
            $filters['notFirstFloor'] = true;
        }
        if ($request->boolean('notLastFloor')) {
            $filters['notLastFloor'] = true;
        }
        if ($request->boolean('highFloor')) {
            $filters['highFloor'] = true;
        }
        if ($request->boolean('hasPlan')) {
            $filters['hasPlan'] = true;
        }
        
        if ($request->has('district')) {
            $filters['district'] = $request->input('district');
        }
        
        if ($request->has('subway')) {
            $filters['subway'] = $request->input('subway');
        }
        if ($request->has('subwayTimeMax')) {
            $filters['subwayTimeMax'] = (int) $request->input('subwayTimeMax');
        }
        if ($request->has('subwayDistanceType')) {
            $filters['subwayDistanceType'] = $request->input('subwayDistanceType');
        }
        if ($request->has('buildingType')) {
            $filters['buildingType'] = $request->input('buildingType');
        }
        if ($request->has('queue')) {
            $filters['queue'] = $request->input('queue');
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
        
        // Сортировка
        $filters['sort'] = $request->input('sort', 'price_asc');
        $filters['order'] = $request->input('order', 'asc');
        
        return $filters;
    }
}

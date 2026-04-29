<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchCountRequest;
use App\Services\Catalog\Search\SearchService;
use Illuminate\Http\JsonResponse;

class SearchCountController extends Controller
{
    public function __construct(
        private SearchService $searchService
    ) {}

    public function index(SearchCountRequest $request): JsonResponse
    {
        $type = $request->input('type');

        if ($type !== 'apartment') {
            return response()->json([
                'apartments' => 0,
                'complexes'  => 0,
            ]);
        }

        $filters = $this->extractFilters($request);
        $counts = $this->searchService->countSearch($filters);

        return response()->json([
            'apartments' => $counts['apartments'],
            'complexes'  => $counts['complexes'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractFilters(SearchCountRequest $request): array
    {
        $filters = [];

        if ($request->filled('search')) {
            $filters['search'] = trim((string) $request->input('search'));
        }

        if ($request->filled('subway')) {
            $filters['subway'] = array_values(array_filter(array_map(
                'strval',
                (array) $request->input('subway')
            )));
        }

        if ($request->filled('district')) {
            $filters['district'] = array_values(array_filter(array_map(
                'strval',
                (array) $request->input('district')
            )));
        }

        if ($request->filled('builder')) {
            $filters['builder'] = array_values(array_filter(array_map(
                'strval',
                (array) $request->input('builder')
            )));
        }

        if ($request->filled('price_from')) {
            $filters['priceMin'] = (int) $request->input('price_from');
        }

        if ($request->filled('price_to')) {
            $filters['priceMax'] = (int) $request->input('price_to');
        }

        if ($request->filled('area_min')) {
            $filters['areaMin'] = (float) $request->input('area_min');
        }

        if ($request->filled('area_max')) {
            $filters['areaMax'] = (float) $request->input('area_max');
        }

        if ($request->filled('ceiling_height_min')) {
            $filters['ceilingHeightMin'] = (float) $request->input('ceiling_height_min');
        }

        if ($request->filled('ceiling_height_max')) {
            $filters['ceilingHeightMax'] = (float) $request->input('ceiling_height_max');
        }

        if ($request->filled('living_area_min')) {
            $filters['livingAreaMin'] = (float) $request->input('living_area_min');
        }

        if ($request->filled('living_area_max')) {
            $filters['livingAreaMax'] = (float) $request->input('living_area_max');
        }

        if ($request->filled('floor_min')) {
            $filters['floorMin'] = (int) $request->input('floor_min');
        }

        if ($request->filled('floor_max')) {
            $filters['floorMax'] = (int) $request->input('floor_max');
        }

        $rooms = $this->normalizeRooms($request->input('rooms'));
        if ($rooms !== null) {
            $filters['rooms'] = $rooms;
        }

        if ($request->filled('wc')) {
            $filters['wc'] = [(int) $request->input('wc')];
        }

        if ($request->filled('completion')) {
            $filters['deadline'] = [(string) $request->input('completion')];
        }

        if ($request->filled('subway_time_max')) {
            $filters['subwayTimeMax'] = (int) $request->input('subway_time_max');
        }

        if ($request->filled('subway_distance_type')) {
            $filters['subwayDistanceType'] = array_values(
                array_map('intval', (array) $request->input('subway_distance_type'))
            );
        }

        if ($request->filled('building_type')) {
            $filters['buildingType'] = array_values(
                array_filter(array_map('strval', (array) $request->input('building_type')))
            );
        }

        if ($request->filled('queue')) {
            $filters['queue'] = array_values(
                array_filter(array_map('strval', (array) $request->input('queue')))
            );
        }

        if ($request->boolean('not_first_floor')) {
            $filters['notFirstFloor'] = true;
        }

        if ($request->boolean('not_last_floor')) {
            $filters['notLastFloor'] = true;
        }

        if ($request->boolean('high_floor')) {
            $filters['highFloor'] = true;
        }

        if ($request->boolean('has_plan')) {
            $filters['hasPlan'] = true;
        }

        if ($request->filled('sort')) {
            $filters['sort'] = (string) $request->input('sort');
        }

        return $filters;
    }

    /**
     * @return array<int, int>|null
     */
    private function normalizeRooms(mixed $rooms): ?array
    {
        if ($rooms === null || $rooms === '') {
            return null;
        }

        if (is_int($rooms) || is_float($rooms)) {
            $room = (int) $rooms;
            return in_array($room, [0, 1, 2, 3, 4], true) ? [$room] : null;
        }

        if (is_array($rooms)) {
            $out = array_values(array_filter(array_map('intval', $rooms), fn (int $r) => in_array($r, [0, 1, 2, 3, 4], true)));

            return $out === [] ? null : $out;
        }

        if (is_string($rooms)) {
            if (is_numeric($rooms)) {
                $room = (int) $rooms;
                return in_array($room, [0, 1, 2, 3, 4], true) ? [$room] : null;
            }

            $map = [
                'Студия'        => [0],
                '1-комнатная'   => [1],
                '2-комнатная'   => [2],
                '3-комнатная'   => [3],
                '4+ комнат'     => [4],
            ];

            return $map[$rooms] ?? null;
        }

        return null;
    }
}

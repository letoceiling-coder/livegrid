<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Complex;
use App\Services\Home\HomeFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    public function __construct(
        private HomeFormatter $formatter
    ) {}

    public function blocks(Request $request): JsonResponse
    {
        $limit = max(1, min((int) $request->get('limit', 8), 12));

        $popular = $this->loadPopularComplexes($limit);
        $hot = $this->loadHotApartments($limit);
        $start = $this->loadStartComplexes($limit);

        $stats = Cache::remember('home_stats', 300, function () {
            return [
                'complexes' => Complex::query()->count(),
                'apartments' => Apartment::query()->count(),
            ];
        });

        return response()->json([
            'popular' => $popular ?? [],
            'hot' => $hot ?? [],
            'start' => $start ?? [],
            'stats' => $stats ?? [],
            'meta' => [
                'generated_at' => now()->toISOString(),
                'version' => 'v1',
            ],
        ]);
    }

    public function offers(Request $request): JsonResponse
    {
        $type = $request->get('type', 'hot');

        if (! in_array($type, ['hot', 'start'], true)) {
            return response()->json([
                'data' => [],
            ]);
        }

        $limit = max(1, min((int) $request->get('limit', 8), 12));

        if ($type === 'start') {
            $items = $this->loadStartComplexes($limit);
        } else {
            $items = array_map(
                fn (Apartment $a) => $this->formatter->formatHotApartment($a),
                $this->queryHotApartments($limit)->all()
            );
        }

        return response()->json([
            'data' => $items ?? [],
        ]);
    }

    public function news(): JsonResponse
    {
        return response()->json([
            [
                'id' => 1,
                'title' => 'Скоро новости',
                'date' => now()->toIso8601String(),
                'image' => null,
            ],
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadPopularComplexes(int $limit): array
    {
        if (! $this->complexesSearchTableExists()) {
            return [];
        }

        $ids = DB::table('complexes_search')
            ->where('status', '!=', 'deleted')
            ->where('available_apartments', '>', 0)
            ->where('price_from', '>', 0)
            ->orderByDesc('available_apartments')
            ->limit($limit)
            ->pluck('complex_id');

        if ($ids->isEmpty()) {
            return [];
        }

        $searchById = DB::table('complexes_search')
            ->whereIn('complex_id', $ids)
            ->get()
            ->keyBy('complex_id');

        $order = $ids->flip();

        $complexes = Complex::query()
            ->with([
                'district:id,name',
                'subways:id,name',
            ])
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn (Complex $c) => $order[$c->id] ?? 999)
            ->values();

        $out = [];
        foreach ($complexes as $complex) {
            $row = $searchById->get($complex->id);
            $out[] = $this->formatter->formatPopularComplex($complex, $row);
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadHotApartments(int $limit): array
    {
        return array_map(
            fn (Apartment $a) => $this->formatter->formatHotApartment($a),
            $this->queryHotApartments($limit)->all()
        );
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Apartment>
     */
    private function queryHotApartments(int $limit)
    {
        return Apartment::query()
            ->with([
                'complex:id,name,slug,address',
            ])
            ->where('is_active', 1)
            ->where('status', 'available')
            ->orderByRaw('(price / NULLIF(area_total, 0)) ASC')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadStartComplexes(int $limit): array
    {
        $complexes = Complex::query()
            ->with([
                'district:id,name',
                'subways:id,name',
            ])
            ->where('status', 'building')
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        if ($complexes->isEmpty()) {
            return [];
        }

        $searchById = collect();
        if ($this->complexesSearchTableExists()) {
            $searchById = DB::table('complexes_search')
                ->whereIn('complex_id', $complexes->pluck('id'))
                ->get()
                ->keyBy('complex_id');
        }

        $out = [];
        foreach ($complexes as $complex) {
            $row = $searchById->get($complex->id);
            $out[] = $this->formatter->formatStartComplex($complex, $row);
        }

        return $out;
    }

    private function complexesSearchTableExists(): bool
    {
        static $exists;

        if ($exists === null) {
            $exists = DB::getSchemaBuilder()->hasTable('complexes_search');
        }

        return $exists;
    }
}

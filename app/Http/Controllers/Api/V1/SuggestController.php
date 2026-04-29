<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * GET /api/v1/search/suggest?q=жк
 *
 * Группы (каждая — до лимита, без общего «10 штук всего»):
 *   complexes[], metros[], districts[], streets[], builders[]
 */
class SuggestController extends Controller
{
    /** Макс. позиций в подсказках ЖК и метро (единый потолок для UI со скроллом). */
    private const LIMIT_COMPLEXES = 50;

    private const LIMIT_METROS = 50;

    private const LIMIT_DISTRICTS = 80;

    private const LIMIT_STREETS = 50;

    private const LIMIT_BUILDERS = 40;

    public function index(Request $request): JsonResponse
    {
        $q = trim($request->input('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([
                'complexes' => [],
                'metros'    => [],
                'districts' => [],
                'streets'   => [],
                'builders'  => [],
            ]);
        }

        Log::debug('[Suggest] query', ['q' => $q]);

        $cacheKey = 'suggest:v3:grouped:' . md5(mb_strtolower($q));

        $results = Cache::remember($cacheKey, 60, function () use ($q) {
            $likeRaw = '%' . $q . '%';
            $prefix = $q . '%';
            $qNorm = mb_strtolower($q);
            // «жк» — часто ищут все ЖК: отдаём топ по доступным квартирам (до LIMIT).
            $isZhkBrowse = ($qNorm === 'жк');
            // «метро» — показать станции (до LIMIT), а не только строки с подстрокой «метро» в названии.
            $isMetroBrowse = ($qNorm === 'метро');

            if ($isZhkBrowse) {
                $complexes = DB::table('complexes_search')
                    ->where('status', '!=', 'deleted')
                    ->where('available_apartments', '>', 0)
                    ->orderByDesc('available_apartments')
                    ->limit(self::LIMIT_COMPLEXES)
                    ->get(['complex_id', 'slug', 'name', 'district_name', 'subway_name', 'images']);
            } else {
                $complexes = DB::table('complexes_search')
                    ->where('status', '!=', 'deleted')
                    ->where('available_apartments', '>', 0)
                    ->where(function ($sq) use ($likeRaw) {
                        $sq->where('name', 'LIKE', $likeRaw)
                            ->orWhere('slug', 'LIKE', $likeRaw)
                            ->orWhere('description', 'LIKE', $likeRaw)
                            ->orWhere('address', 'LIKE', $likeRaw)
                            ->orWhere('district_name', 'LIKE', $likeRaw)
                            ->orWhere('subway_name', 'LIKE', $likeRaw)
                            ->orWhere('builder_name', 'LIKE', $likeRaw);
                    })
                    ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$likeRaw])
                    ->orderByDesc('available_apartments')
                    ->limit(self::LIMIT_COMPLEXES)
                    ->get(['complex_id', 'slug', 'name', 'district_name', 'subway_name', 'images']);
            }

            if ($isMetroBrowse) {
                $metros = DB::table('subways')
                    ->orderBy('name')
                    ->limit(self::LIMIT_METROS)
                    ->get(['id', 'name']);
            } else {
                $metros = DB::table('subways')
                    ->where('name', 'LIKE', $likeRaw)
                    ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$prefix])
                    ->orderBy('name')
                    ->limit(self::LIMIT_METROS)
                    ->get(['id', 'name']);
            }

            $districts = DB::table('regions')
                ->where('name', 'LIKE', $likeRaw)
                ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$prefix])
                ->orderBy('name')
                ->limit(self::LIMIT_DISTRICTS)
                ->get(['id', 'name']);

            $builders = DB::table('builders')
                ->where('name', 'LIKE', $likeRaw)
                ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$prefix])
                ->orderBy('name')
                ->limit(self::LIMIT_BUILDERS)
                ->get(['id', 'name']);

            $streets = DB::table('complexes_search')
                ->where('address', 'LIKE', $likeRaw)
                ->whereNotNull('address')
                ->where('address', '!=', '')
                ->selectRaw('MIN(complex_id) as id, address as name')
                ->groupBy('address')
                ->orderBy('name')
                ->limit(self::LIMIT_STREETS)
                ->get();

            $outComplexes = [];
            foreach ($complexes as $c) {
                $images = json_decode($c->images ?? '[]', true) ?? [];
                $outComplexes[] = [
                    'type'     => 'complex',
                    'id'       => (string) $c->complex_id,
                    'slug'     => $c->slug,
                    'name'     => $c->name,
                    'district' => $c->district_name ?? '',
                    'subway'   => $c->subway_name ?? '',
                    'image'    => $images[0] ?? '',
                ];
            }

            $outMetros = [];
            foreach ($metros as $m) {
                $outMetros[] = [
                    'type' => 'metro',
                    'id'   => $m->id,
                    'name' => $m->name,
                ];
            }

            $outDistricts = [];
            foreach ($districts as $d) {
                $outDistricts[] = [
                    'type' => 'district',
                    'id'   => $d->id,
                    'name' => $d->name,
                ];
            }

            $outStreets = [];
            foreach ($streets as $s) {
                $outStreets[] = [
                    'type' => 'street',
                    'id'   => $s->id,
                    'name' => $s->name,
                ];
            }

            $outBuilders = [];
            foreach ($builders as $b) {
                $outBuilders[] = [
                    'type' => 'builder',
                    'id'   => $b->id,
                    'name' => $b->name,
                ];
            }

            Log::debug('[Suggest] results', [
                'q'          => $q,
                'complexes'  => count($outComplexes),
                'metros'     => count($outMetros),
                'districts'  => count($outDistricts),
                'streets'    => count($outStreets),
                'builders'   => count($outBuilders),
            ]);

            return [
                'complexes' => $outComplexes,
                'metros'    => $outMetros,
                'districts' => $outDistricts,
                'streets'   => $outStreets,
                'builders'  => $outBuilders,
            ];
        });

        return response()->json($results);
    }
}

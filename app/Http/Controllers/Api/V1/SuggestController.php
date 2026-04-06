<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * GET /api/v1/search/suggest?q=ко
 *
 * Returns up to 10 mixed suggestions:
 *   { type: "complex",  id, slug, name, district, subway, image }
 *   { type: "metro",    id, name }
 *   { type: "district", id, name }
 */
class SuggestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim($request->input('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        Log::debug('[Suggest] query', ['q' => $q]);

        $cacheKey = 'suggest:' . md5(mb_strtolower($q));

        $results = Cache::remember($cacheKey, 60, function () use ($q) {
            $like = '%' . $q . '%';

            // ── Complexes (up to 5) ────────────────────────────────────────
            $complexes = DB::table('complexes_search')
                ->where('status', '!=', 'deleted')
                ->where('available_apartments', '>', 0)
                ->where(function ($sq) use ($like) {
                    $sq->where('name',          'LIKE', $like)
                       ->orWhere('address',      'LIKE', $like)
                       ->orWhere('district_name','LIKE', $like)
                       ->orWhere('subway_name',  'LIKE', $like)
                       ->orWhere('builder_name', 'LIKE', $like);
                })
                ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$like])
                ->orderBy('available_apartments', 'desc')
                ->limit(5)
                ->get(['complex_id', 'slug', 'name', 'district_name', 'subway_name', 'images']);

            // ── Metros (up to 3) ───────────────────────────────────────────
            $metros = DB::table('subways')
                ->where('name', 'LIKE', $like)
                ->orderBy('name')
                ->limit(3)
                ->get(['id', 'name']);

            // ── Districts (up to 3) ────────────────────────────────────────
            $districts = DB::table('regions')
                ->where('name', 'LIKE', $like)
                ->orderBy('name')
                ->limit(3)
                ->get(['id', 'name']);

            $output = [];

            foreach ($complexes as $c) {
                $images = json_decode($c->images ?? '[]', true) ?? [];
                $output[] = [
                    'type'     => 'complex',
                    'id'       => $c->complex_id,
                    'slug'     => $c->slug,
                    'name'     => $c->name,
                    'district' => $c->district_name ?? '',
                    'subway'   => $c->subway_name   ?? '',
                    'image'    => $images[0] ?? '',
                ];
            }

            foreach ($metros as $m) {
                $output[] = [
                    'type' => 'metro',
                    'id'   => $m->id,
                    'name' => $m->name,
                ];
            }

            foreach ($districts as $d) {
                $output[] = [
                    'type' => 'district',
                    'id'   => $d->id,
                    'name' => $d->name,
                ];
            }

            Log::debug('[Suggest] results', [
                'q'         => $q,
                'complexes' => count($complexes),
                'metros'    => count($metros),
                'districts' => count($districts),
                'total'     => count($output),
            ]);

            return $output;
        });

        return response()->json($results);
    }
}

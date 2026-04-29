<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserFavorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FavoritesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Не авторизован.'], 401);
        }

        $perPage = min(max((int) $request->input('perPage', 5), 1), 50);
        $page = max((int) $request->input('page', 1), 1);

        $base = UserFavorite::query()
            ->where('user_id', $user->id)
            ->join('blocks', 'blocks.id', '=', 'user_favorites.block_id')
            ->leftJoin('complexes_search as cs', 'cs.complex_id', '=', 'blocks.id')
            ->leftJoin('regions as districts', 'districts.id', '=', 'blocks.district_id')
            ->leftJoin('builders', 'builders.id', '=', 'blocks.builder_id')
            ->leftJoin('block_subway as bs', 'bs.block_id', '=', 'blocks.id')
            ->leftJoin('subways as sw', 'sw.id', '=', 'bs.subway_id')
            ->select([
                'blocks.id',
                'blocks.slug',
                'blocks.name',
                'blocks.address',
                'blocks.status',
                'blocks.deadline',
                'blocks.images',
                'districts.name as district_name',
                'builders.name as builder_name',
                'sw.id as subway_id',
                'sw.name as subway_name',
                'bs.distance_time as subway_distance_time',
                'cs.price_from',
                'cs.price_to',
            ])
            ->groupBy([
                'blocks.id',
                'blocks.slug',
                'blocks.name',
                'blocks.address',
                'blocks.status',
                'blocks.deadline',
                'blocks.images',
                'districts.name',
                'builders.name',
                'sw.id',
                'sw.name',
                'bs.distance_time',
                'cs.price_from',
                'cs.price_to',
            ]);

        $total = (clone $base)->count(DB::raw('distinct blocks.id'));
        $rows = (clone $base)
            ->orderByDesc('user_favorites.created_at')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => $row->id,
                'slug' => $row->slug,
                'name' => $row->name,
                'district' => $row->district_name ? ['name' => $row->district_name] : null,
                'subway' => $row->subway_id ? ['id' => $row->subway_id, 'name' => $row->subway_name] : null,
                'subwayDistance' => $row->subway_distance_time ? ((int) $row->subway_distance_time . ' мин') : null,
                'builder' => $row->builder_name ? ['name' => $row->builder_name] : null,
                'address' => $row->address,
                'status' => $row->status,
                'deadline' => $row->deadline,
                'priceFrom' => $row->price_from ? (int) $row->price_from : null,
                'priceTo' => $row->price_to ? (int) $row->price_to : null,
                'images' => is_array($row->images) ? $row->images : (json_decode((string) $row->images, true) ?: []),
                'roomsBreakdown' => [],
            ];
        })->values()->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'perPage' => $perPage,
                'lastPage' => (int) ceil(max($total, 1) / $perPage),
            ],
        ]);
    }
}

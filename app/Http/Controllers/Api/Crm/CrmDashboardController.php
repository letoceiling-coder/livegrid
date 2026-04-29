<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Builder;
use App\Models\Catalog\Complex;
use App\Models\Catalog\District;
use App\Services\Auth\AccessScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmDashboardController extends Controller
{
    public function __construct(private readonly AccessScope $accessScope) {}

    public function index(Request $request): JsonResponse
    {
        return $this->stats($request);
    }

    public function stats(Request $request): JsonResponse
    {
        $complexQuery = $this->accessScope->apply(Complex::query(), $request->user(), 'properties.read');
        $apartmentQuery = $this->accessScope->apply(Apartment::query(), $request->user(), 'properties.read');

        $totalComplexes  = (clone $complexQuery)->count();
        $totalApartments = (clone $apartmentQuery)->where('is_active', 1)->count();
        $totalBuilders   = Builder::count();
        $totalDistricts  = District::count();

        $availableApts  = (clone $apartmentQuery)->where('is_active', 1)->where('status', 'available')->count();
        $reservedApts   = (clone $apartmentQuery)->where('is_active', 1)->where('status', 'reserved')->count();
        $soldApts       = (clone $apartmentQuery)->where('is_active', 1)->where('status', 'sold')->count();

        $recentComplexes = $this->accessScope->apply(Complex::with(['builder', 'district']), $request->user(), 'properties.read')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id'      => $c->id,
                'name'    => $c->name,
                'slug'    => $c->slug,
                'builder' => $c->builder?->name,
                'status'  => $c->status,
            ]);

        return response()->json([
            'stats' => [
                'complexes'  => $totalComplexes,
                'apartments' => $totalApartments,
                'builders'   => $totalBuilders,
                'districts'  => $totalDistricts,
            ],
            'apartments_by_status' => [
                'available' => $availableApts,
                'reserved'  => $reservedApts,
                'sold'      => $soldApts,
            ],
            'recent_complexes' => $recentComplexes,
        ]);
    }
}

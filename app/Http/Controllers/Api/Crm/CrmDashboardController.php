<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Apartment;
use App\Models\Catalog\Builder;
use App\Models\Catalog\Complex;
use App\Models\Catalog\District;
use Illuminate\Http\JsonResponse;

class CrmDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->stats();
    }

    public function stats(): JsonResponse
    {
        $totalComplexes  = Complex::count();
        $totalApartments = Apartment::where('is_active', 1)->count();
        $totalBuilders   = Builder::count();
        $totalDistricts  = District::count();

        $availableApts  = Apartment::where('is_active', 1)->where('status', 'available')->count();
        $reservedApts   = Apartment::where('is_active', 1)->where('status', 'reserved')->count();
        $soldApts       = Apartment::where('is_active', 1)->where('status', 'sold')->count();

        $recentComplexes = Complex::with(['builder', 'district'])
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

<?php

namespace App\Http\Resources;

use App\Support\FormatsImages;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplexResource extends JsonResource
{
    use FormatsImages;
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        $subway = $this->subways->first();
        
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'district' => $this->district ? [
                'id' => $this->district->id,
                'name' => $this->district->name,
            ] : null,
            'subway' => $subway ? [
                'id' => $subway->id,
                'name' => $subway->name,
                'line' => $subway->line,
            ] : null,
            'subwayDistance' => $subway ? ($subway->pivot->distance_time ?? null) . ' мин' : null,
            'builder' => $this->builder ? [
                'id' => $this->builder->id,
                'name' => $this->builder->name,
            ] : null,
            'address' => $this->address,
            'coords' => [
                'lat' => (float) $this->lat,
                'lng' => (float) $this->lng,
            ],
            'status' => $this->status,
            'deadline' => $this->deadline,
            'priceFrom' => $this->when(
                $this->relationLoaded('buildings'),
                function () {
                    $min = $this->buildings->flatMap->apartments->min('price');
                    return (int) ($min ?? 0);
                },
                0
            ),
            'priceTo' => $this->when(
                $this->relationLoaded('buildings'),
                function () {
                    $max = $this->buildings->flatMap->apartments->max('price');
                    return (int) ($max ?? 0);
                },
                0
            ),
            'images' => $this->formatImages($this->images),
            'advantages' => $this->advantages ?? [],
            'infrastructure' => $this->infrastructure ?? [],
            'buildings' => BuildingResource::collection($this->whenLoaded('buildings')),
            'totalAvailableApartments' => $this->when(
                $this->relationLoaded('buildings'),
                fn() => $this->buildings->sum(fn ($b) => $b->apartments->count()),
                0
            ),
        ];
    }
}

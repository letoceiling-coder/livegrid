<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'complexId' => $this->block_id,
            'buildingId' => $this->building_id,
            'rooms' => $this->rooms_count,
            'area' => (float) $this->area_total,
            'kitchenArea' => $this->area_kitchen ? (float) $this->area_kitchen : null,
            'floor' => $this->floor,
            'totalFloors' => $this->floors,
            'price' => (int) $this->price,
            'pricePerMeter' => (float) $this->price_per_meter,
            'finishing' => $this->finishing ? $this->finishing->name : null,
            'status' => $this->status,
            'planImage' => $this->plan_image,
            'section' => $this->section,
        ];
    }
}

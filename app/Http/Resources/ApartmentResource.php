<?php

namespace App\Http\Resources;

use App\Support\FormatsImages;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentResource extends JsonResource
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
        return [
            'id' => $this->id,
            'complexId' => $this->block_id,
            'buildingId' => $this->building_id,
            'rooms' => $this->rooms_count,
            'roomName' => $this->roomType?->name_one ?? null,
            'area' => (float) $this->area_total,
            'kitchenArea' => $this->area_kitchen ? (float) $this->area_kitchen : null,
            'floor' => $this->floor,
            'totalFloors' => $this->floors,
            'price' => (int) $this->price,
            'pricePerMeter' => $this->area_total > 0
                ? round((float) $this->price / (float) $this->area_total)
                : 0,
            'finishing' => $this->finishing ? $this->finishing->name : null,
            'status' => $this->status,
            'planImage' => $this->formatImage($this->plan_image),
            'section' => $this->section,
        ];
    }
}

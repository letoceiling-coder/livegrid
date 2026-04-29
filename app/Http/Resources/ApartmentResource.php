<?php

namespace App\Http\Resources;

use App\Support\FormatsImages;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentResource extends JsonResource
{
    use FormatsImages;

    private function deriveRoomCategory(): ?int
    {
        if ($this->roomType?->room_category !== null) {
            return (int) $this->roomType->room_category;
        }

        $name = (string) ($this->roomType?->name_one ?? '');
        if ($name !== '' && preg_match('/студ/i', $name) === 1) {
            return 0;
        }

        return null;
    }
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
            'roomCategory' => $this->deriveRoomCategory(),
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

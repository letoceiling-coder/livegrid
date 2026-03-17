<?php

namespace App\Services\Catalog\Import\DTO;

class ApartmentDTO
{
    public function __construct(
        public readonly string $source,
        public readonly string $externalId,
        public readonly int $price,
        public readonly int $roomsCount,
        public readonly int $floor,
        public readonly int $floors,
        public readonly float $areaTotal,
        public readonly ?float $areaKitchen = null,
        public readonly ?float $areaRoomsTotal = null,
        public readonly ?float $areaBalconies = null,
        public readonly int $buildingId,
        public readonly ?int $finishingId = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'source' => $this->source,
            'external_id' => $this->externalId,
            'price' => $this->price,
            'rooms_count' => $this->roomsCount,
            'floor' => $this->floor,
            'floors' => $this->floors,
            'area_total' => $this->areaTotal,
            'area_kitchen' => $this->areaKitchen,
            'area_rooms_total' => $this->areaRoomsTotal,
            'area_balconies' => $this->areaBalconies,
            'building_id' => $this->buildingId,
            'finishing_id' => $this->finishingId,
        ];
    }
}

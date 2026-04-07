<?php

namespace App\Services\Catalog\Import\DTO;

class ApartmentDTO
{
    public function __construct(
        public readonly int $sourceId,
        public readonly string $externalId,
        public readonly string $buildingId,
        public readonly string $blockId,
        public readonly ?string $builderId = null,
        public readonly int $price,
        public readonly int $roomsCount,
        public readonly int $floor,
        public readonly int $floors,
        public readonly float $areaTotal,
        public readonly ?float $areaKitchen = null,
        public readonly ?float $areaRoomsTotal = null,
        public readonly ?float $areaBalconies = null,
        public readonly ?float $lat = null,
        public readonly ?float $lng = null,
        public readonly string $blockName = '',
        public readonly string $builderName = '',
        public readonly string $districtName = '',
        public readonly ?string $planImage = null,
        public readonly ?int $section = null,
        public readonly ?string $finishingId = null,
        public readonly array $attributes = [], // Dynamic attributes: ['wc_count' => 2, 'height' => 2.8]
    ) {
    }

    /**
     * Convert DTO to array for database insert
     */
    public function toArray(): array
    {
        return [
            'source_id' => $this->sourceId,
            'external_id' => $this->externalId,
            'building_id' => $this->buildingId,
            'block_id' => $this->blockId,
            'builder_id' => $this->builderId,
            'price' => $this->price,
            'rooms_count' => $this->roomsCount,
            'floor' => $this->floor,
            'floors' => $this->floors,
            'area_total' => $this->areaTotal,
            'area_kitchen' => $this->areaKitchen,
            'area_rooms_total' => $this->areaRoomsTotal,
            'area_balconies' => $this->areaBalconies,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'block_name' => $this->blockName,
            'builder_name' => $this->builderName,
            'district_name' => $this->districtName,
            'plan_image' => $this->planImage,
            'section' => $this->section,
            'finishing_id' => $this->finishingId,
        ];
    }

    /**
     * Get unique key for upsert
     */
    public function getUniqueKey(): array
    {
        return [
            'source_id' => $this->sourceId,
            'external_id' => $this->externalId,
        ];
    }
}

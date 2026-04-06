<?php

namespace App\Services\Catalog\Import;

use App\Services\Catalog\Import\DTO\ApartmentDTO;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Maps raw JSON feed data to ApartmentDTO
 * Handles feed-specific field mapping and transformation
 */
class FeedMapper
{
    private int $sourceId;

    public function __construct(
        private AttributeMapper $attributeMapper,
    ) {
    }

    /**
     * Set source ID for mapping
     */
    public function setSourceId(int $sourceId): void
    {
        $this->sourceId = $sourceId;
    }

    /**
     * Map raw feed JSON to ApartmentDTO
     *
     * @param array $rawData Raw apartment data from feed
     * @return ApartmentDTO
     * @throws \InvalidArgumentException
     */
    public function map(array $rawData): ApartmentDTO
    {
        if (empty($this->sourceId)) {
            throw new \InvalidArgumentException('Source ID must be set before mapping');
        }

        // Extract external_id from _id field
        $externalId = $rawData['_id'] ?? null;
        if (!$externalId) {
            Log::error('Missing _id in feed data', [
                'source_id' => $this->sourceId,
                'payload_keys' => array_keys($rawData),
            ]);
            throw new \InvalidArgumentException("Required field '_id' is missing");
        }
        
        // Ensure external_id is string for idempotency
        $externalId = (string) $externalId;

        // Extract building_id
        $buildingId = $rawData['building_id'] ?? null;
        if (!$buildingId) {
            throw new \InvalidArgumentException("Required field 'building_id' is missing");
        }

        // Extract block_id
        $blockId = $rawData['block_id'] ?? null;
        if (!$blockId) {
            throw new \InvalidArgumentException("Required field 'block_id' is missing");
        }

        // Extract builder_id (from block_builder field)
        $builderId = $rawData['block_builder'] ?? null;

        // Extract price
        $price = $this->getInteger($rawData, 'price');
        if ($price <= 0) {
            throw new \InvalidArgumentException("Invalid price: {$price}");
        }

        // Extract rooms_count (from 'room' field in feed)
        $roomsCount = $this->getInteger($rawData, 'room');

        // Extract floor and floors
        $floor = $this->getInteger($rawData, 'floor');
        $floors = $this->getInteger($rawData, 'floors');

        // Extract area fields
        $areaTotal = $this->getFloat($rawData, 'area_total');
        $areaKitchen = $this->getFloatOrNull($rawData, 'area_kitchen');
        $areaRoomsTotal = $this->getFloatOrNull($rawData, 'area_rooms_total');
        $areaBalconies = $this->getFloatOrNull($rawData, 'area_balconies_total') 
            ?? $this->getFloatOrNull($rawData, 'area_balconies');

        // Extract coordinates (from block_geometry or lat/lng)
        $lat = null;
        $lng = null;
        if (isset($rawData['block_geometry']['coordinates'])) {
            $coords = $rawData['block_geometry']['coordinates'];
            $lng = (float) ($coords[0] ?? null);
            $lat = (float) ($coords[1] ?? null);
        }

        // Extract denormalized fields
        $blockName = $rawData['block_name'] ?? '';
        $builderName = $rawData['block_builder_name'] ?? '';
        $districtName = $rawData['block_district_name'] ?? '';

        // Extract plan image: feed field 'plan' is an array of URLs
        $planImage = null;
        if (!empty($rawData['plan']) && is_array($rawData['plan'])) {
            $planImage = $rawData['plan'][0] ?? null;
        } elseif (!empty($rawData['plan']) && is_string($rawData['plan'])) {
            $planImage = $rawData['plan'];
        }

        // Extract section (feed may not have it; default null)
        $section = isset($rawData['section']) ? (int) $rawData['section'] : null;

        // Extract dynamic attributes
        $attributes = $this->attributeMapper->extractAttributes($rawData);

        return new ApartmentDTO(
            sourceId: $this->sourceId,
            externalId: (string) $externalId,
            buildingId: (string) $buildingId,
            blockId: (string) $blockId,
            builderId: $builderId ? (string) $builderId : null,
            price: $price,
            roomsCount: $roomsCount,
            floor: $floor,
            floors: $floors,
            areaTotal: $areaTotal,
            areaKitchen: $areaKitchen,
            areaRoomsTotal: $areaRoomsTotal,
            areaBalconies: $areaBalconies,
            lat: $lat,
            lng: $lng,
            blockName: $blockName,
            builderName: $builderName,
            districtName: $districtName,
            planImage: $planImage,
            section: $section,
            attributes: $attributes,
        );
    }

    /**
     * Get integer value from array
     */
    private function getInteger(array $data, string $key): int
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            throw new \InvalidArgumentException("Required field '{$key}' is missing or empty");
        }

        return (int) $data[$key];
    }

    /**
     * Get float value from array
     */
    private function getFloat(array $data, string $key): float
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            throw new \InvalidArgumentException("Required field '{$key}' is missing or empty");
        }

        return (float) $data[$key];
    }

    /**
     * Get float or null from array
     */
    private function getFloatOrNull(array $data, string $key): ?float
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            return null;
        }

        return (float) $data[$key];
    }
}

<?php

namespace App\Services\Catalog\Import;

use App\Services\Catalog\Import\DTO\ApartmentDTO;

class Normalizer
{
    /**
     * Normalize raw JSON data to ApartmentDTO
     *
     * @param array $rawData
     * @return ApartmentDTO
     * @throws \InvalidArgumentException
     */
    public function normalize(array $rawData): ApartmentDTO
    {
        return new ApartmentDTO(
            source: $this->getString($rawData, 'source'),
            externalId: $this->getString($rawData, 'external_id'),
            price: $this->getInteger($rawData, 'price'),
            roomsCount: $this->getInteger($rawData, 'rooms_count'),
            floor: $this->getInteger($rawData, 'floor'),
            floors: $this->getInteger($rawData, 'floors'),
            areaTotal: $this->getFloat($rawData, 'area_total'),
            areaKitchen: $this->getFloatOrNull($rawData, 'area_kitchen'),
            areaRoomsTotal: $this->getFloatOrNull($rawData, 'area_rooms_total'),
            areaBalconies: $this->getFloatOrNull($rawData, 'area_balconies'),
            buildingId: $this->getInteger($rawData, 'building_id'),
            finishingId: $this->getIntegerOrNull($rawData, 'finishing_id'),
        );
    }

    /**
     * Get string value from array
     *
     * @param array $data
     * @param string $key
     * @return string
     * @throws \InvalidArgumentException
     */
    private function getString(array $data, string $key): string
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            throw new \InvalidArgumentException("Required field '{$key}' is missing or empty");
        }

        return (string) $data[$key];
    }

    /**
     * Get integer value from array
     *
     * @param array $data
     * @param string $key
     * @return int
     * @throws \InvalidArgumentException
     */
    private function getInteger(array $data, string $key): int
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            throw new \InvalidArgumentException("Required field '{$key}' is missing or empty");
        }

        return (int) $data[$key];
    }

    /**
     * Get integer or null from array
     *
     * @param array $data
     * @param string $key
     * @return int|null
     */
    private function getIntegerOrNull(array $data, string $key): ?int
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            return null;
        }

        return (int) $data[$key];
    }

    /**
     * Get float value from array
     *
     * @param array $data
     * @param string $key
     * @return float
     * @throws \InvalidArgumentException
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
     *
     * @param array $data
     * @param string $key
     * @return float|null
     */
    private function getFloatOrNull(array $data, string $key): ?float
    {
        if (!isset($data[$key]) || $data[$key] === null || $data[$key] === '') {
            return null;
        }

        return (float) $data[$key];
    }
}

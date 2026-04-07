<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Import buildings from feed
 * Buildings must be imported after blocks and before apartments
 */
class BuildingImporter
{
    /**
     * Import buildings from JSON file
     *
     * @param string $filePath Path to buildings.json
     * @param int $sourceId Source ID
     * @return array Statistics
     */
    public function importFromFile(string $filePath, int $sourceId): array
    {
        if (!file_exists($filePath)) {
            Log::warning("Buildings file not found", ['file' => $filePath]);
            return ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0, 'skipped' => 0];
        }

        $content = file_get_contents($filePath);
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
        }

        if (!is_array($data)) {
            throw new \InvalidArgumentException('JSON must contain an array');
        }

        return $this->import($data, $sourceId);
    }

    /**
     * Import buildings from array
     *
     * @param array $data Array of building data
     * @param int $sourceId Source ID
     * @return array Statistics
     */
    public function import(array $data, int $sourceId): array
    {
        $stats = ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0, 'skipped' => 0];

        Log::info("Starting buildings import", [
            'source_id' => $sourceId,
            'total_items' => count($data),
        ]);

        foreach ($data as $item) {
            try {
                $externalId = $item['_id'] ?? $item['id'] ?? null;
                if (!$externalId) {
                    Log::warning('Building missing _id', ['item' => $item]);
                    $stats['errors']++;
                    continue;
                }

                $feedBlockId = $item['block_id'] ?? null;
                if (!$feedBlockId) {
                    Log::warning('Building missing block_id', [
                        'source_id' => $sourceId,
                        'external_id' => $externalId,
                    ]);
                    $stats['skipped']++;
                    continue;
                }

                // Find block.id by block.external_id
                $blockId = DB::table('blocks')
                    ->where('external_id', $feedBlockId)
                    ->value('id');

                if (!$blockId) {
                    Log::warning('Building block_id not found, skipping', [
                        'source_id' => $sourceId,
                        'external_id' => $externalId,
                        'feed_block_id' => $feedBlockId,
                    ]);
                    $stats['skipped']++;
                    continue;
                }

                $name = $item['name'] ?? '';

                $address = null;
                if (!empty($item['address']) && is_array($item['address'])) {
                    $parts = array_filter([
                        $item['address']['street'] ?? null,
                        $item['address']['house'] ?? null,
                        $item['address']['housing'] ?? null,
                    ]);
                    $address = $parts !== [] ? implode(', ', $parts) : null;
                }

                $lat = null;
                $lng = null;
                if (!empty($item['geometry']['coordinates'][0]) && is_array($item['geometry']['coordinates'][0])) {
                    $ring = $item['geometry']['coordinates'][0];
                    if (isset($ring[0][0], $ring[0][1])) {
                        $lng = (float) $ring[0][0];
                        $lat = (float) $ring[0][1];
                    }
                }

                $queue = isset($item['queue']) ? (string) $item['queue'] : null;

                // Find building_type_id - in reference tables, id = external_id (feed _id)
                $buildingTypeId = null;
                $feedBuildingTypeId = $item['building_type'] ?? $item['building_type_id'] ?? null;
                if ($feedBuildingTypeId) {
                    // For reference tables, id = external_id (feed _id)
                    $buildingTypeId = DB::table('building_types')
                        ->where('id', $feedBuildingTypeId)
                        ->value('id');
                }
                
                $deadline = $item['deadline'] ?? null;
                if ($deadline) {
                    try {
                        $deadline = \Carbon\Carbon::parse($deadline)->format('Y-m-d');
                    } catch (\Exception $e) {
                        $deadline = null;
                    }
                }

                // Check if exists by (source_id, external_id)
                $existing = DB::table('buildings')
                    ->where('source_id', $sourceId)
                    ->where('external_id', $externalId)
                    ->first();

                // Generate UUID for new records
                $id = $existing ? $existing->id : (string) \Illuminate\Support\Str::uuid();

                // sections and floors are not in the feed — derive them later from apartments
                $buildingData = [
                    'id' => $id,
                    'block_id' => $blockId,
                    'building_type_id' => $buildingTypeId,
                    'name' => $name,
                    'address' => $address,
                    'lat' => $lat,
                    'lng' => $lng,
                    'queue' => $queue,
                    'deadline' => $deadline,
                    'source_id' => $sourceId,
                    'external_id' => $externalId,
                    'created_at' => now(),
                    // floors/sections will be updated in a post-import pass via recalcBuildingDimensions()
                ];

                if ($existing) {
                    // Update existing
                    unset($buildingData['id']); // Don't update primary key
                    DB::table('buildings')
                        ->where('id', $existing->id)
                        ->update($buildingData);
                    $stats['updated']++;
                } else {
                    // Insert new
                    DB::table('buildings')->insert($buildingData);
                    $stats['created']++;
                }

                $stats['processed']++;
            } catch (\Exception $e) {
                Log::error('Failed to import building', [
                    'source_id' => $sourceId,
                    'error' => $e->getMessage(),
                    'item' => $item,
                ]);
                $stats['errors']++;
            }
        }

        Log::info("Buildings import finished", [
            'source_id' => $sourceId,
            'stats' => $stats,
        ]);

        return $stats;
    }

    /**
     * Recalculate floors and sections for all buildings based on actual apartment data.
     * Call this AFTER apartments have been imported.
     */
    public function recalcBuildingDimensions(): int
    {
        // Update floors = MAX(floor) from apartments, sections = COUNT(DISTINCT section)
        // For buildings where apartments have no section data, default to sections = 1
        $updated = DB::statement("
            UPDATE buildings b
            JOIN (
                SELECT
                    building_id,
                    MAX(floor)  AS max_floor,
                    GREATEST(1, COUNT(DISTINCT CASE WHEN section IS NOT NULL THEN section END)) AS sec_count
                FROM apartments
                WHERE is_active = 1
                GROUP BY building_id
            ) agg ON agg.building_id = b.id
            SET b.floors   = agg.max_floor,
                b.sections = agg.sec_count
        ");

        Log::info('Recalculated building dimensions');

        return DB::table('buildings')
            ->where('floors', '>', 0)
            ->count();
    }
}

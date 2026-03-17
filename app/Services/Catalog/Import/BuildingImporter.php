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

                $buildingData = [
                    'id' => $id,
                    'block_id' => $blockId,
                    'building_type_id' => $buildingTypeId,
                    'name' => $name,
                    'deadline' => $deadline,
                    'source_id' => $sourceId,
                    'external_id' => $externalId,
                    'created_at' => now(),
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
}

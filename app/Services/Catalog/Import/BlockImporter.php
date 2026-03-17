<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Import blocks from feed
 * Blocks must be imported before buildings
 */
class BlockImporter
{
    /**
     * Import blocks from JSON file
     *
     * @param string $filePath Path to blocks.json
     * @param int $sourceId Source ID
     * @return array Statistics
     */
    public function importFromFile(string $filePath, int $sourceId): array
    {
        if (!file_exists($filePath)) {
            Log::warning("Blocks file not found", ['file' => $filePath]);
            return ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0];
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
     * Import blocks from array
     *
     * @param array $data Array of block data
     * @param int $sourceId Source ID
     * @return array Statistics
     */
    public function import(array $data, int $sourceId): array
    {
        $stats = ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0];

        Log::info("Starting blocks import", [
            'source_id' => $sourceId,
            'total_items' => count($data),
        ]);

        foreach ($data as $item) {
            try {
                $externalId = $item['_id'] ?? $item['id'] ?? null;
                if (!$externalId) {
                    Log::warning('Block missing _id', ['item' => $item]);
                    $stats['errors']++;
                    continue;
                }

                $name = $item['name'] ?? '';
                // In feed data, district is stored as 'district', not 'district_id'
                $districtId = $item['district'] ?? $item['district_id'] ?? null;
                $builderId = $item['builder_id'] ?? $item['block_builder'] ?? null;
                
                // Extract coordinates - required for blocks
                $lat = null;
                $lng = null;
                if (isset($item['geometry']['coordinates'])) {
                    $coords = $item['geometry']['coordinates'];
                    $lng = (float) ($coords[0] ?? null);
                    $lat = (float) ($coords[1] ?? null);
                } elseif (isset($item['lat']) && isset($item['lng'])) {
                    $lat = (float) $item['lat'];
                    $lng = (float) $item['lng'];
                }
                
                // Note: lat/lng are required in table schema, but we'll allow NULL for now
                // If both are missing, skip this block
                if ($lat === null && $lng === null) {
                    Log::warning('Block missing coordinates', [
                        'source_id' => $sourceId,
                        'external_id' => $externalId,
                    ]);
                    $stats['errors']++;
                    continue;
                }

                // Find district_id by external_id if district is provided
                $districtId = null;
                if (isset($item['district'])) {
                    $districtId = DB::table('regions')
                        ->where('external_id', $item['district'])
                        ->value('id');
                }

                // Find builder_id by external_id if builder is provided
                $builderId = null;
                if (isset($item['builder_id']) || isset($item['block_builder'])) {
                    $builderExternalId = $item['builder_id'] ?? $item['block_builder'];
                    $builderId = DB::table('builders')
                        ->where('external_id', $builderExternalId)
                        ->value('id');
                }

                // Check if exists by (source_id, external_id)
                $existing = DB::table('blocks')
                    ->where('source_id', $sourceId)
                    ->where('external_id', $externalId)
                    ->first();

                // Generate UUID for new records
                $id = $existing ? $existing->id : (string) \Illuminate\Support\Str::uuid();

                $blockData = [
                    'id' => $id,
                    'name' => $name,
                    'district_id' => $districtId,
                    'builder_id' => $builderId,
                    'source_id' => $sourceId,
                    'external_id' => $externalId,
                    'lat' => $lat,
                    'lng' => $lng,
                    'created_at' => now(),
                ];

                if ($existing) {
                    // Update existing
                    unset($blockData['id']); // Don't update primary key
                    DB::table('blocks')
                        ->where('id', $existing->id)
                        ->update($blockData);
                    $stats['updated']++;
                } else {
                    // Insert new
                    DB::table('blocks')->insert($blockData);
                    $stats['created']++;
                }

                $stats['processed']++;
            } catch (\Exception $e) {
                Log::error('Failed to import block', [
                    'source_id' => $sourceId,
                    'error' => $e->getMessage(),
                    'item' => $item,
                ]);
                $stats['errors']++;
            }
        }

        Log::info("Blocks import finished", [
            'source_id' => $sourceId,
            'stats' => $stats,
        ]);

        return $stats;
    }
}

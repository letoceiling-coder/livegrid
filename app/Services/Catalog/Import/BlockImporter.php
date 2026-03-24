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
                
                // Extract coordinates
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
                
                // Find district_id - in reference tables, id = external_id (feed _id)
                // In feed data, district is stored as 'district', not 'district_id'
                $districtId = null;
                $feedDistrictId = $item['district'] ?? $item['district_id'] ?? null;
                if ($feedDistrictId) {
                    // For reference tables, id = external_id (feed _id)
                    $districtId = DB::table('regions')
                        ->where('id', $feedDistrictId)
                        ->value('id');
                }

                // Find builder_id - in reference tables, id = external_id (feed _id)
                $builderId = null;
                $feedBuilderId = $item['builder_id'] ?? $item['block_builder'] ?? null;
                if ($feedBuilderId) {
                    // For reference tables, id = external_id (feed _id)
                    $builderId = DB::table('builders')
                        ->where('id', $feedBuilderId)
                        ->value('id');
                }

                // Check if exists by (source_id, external_id)
                $existing = DB::table('blocks')
                    ->where('source_id', $sourceId)
                    ->where('external_id', $externalId)
                    ->first();

                // Generate UUID for new records
                $id = $existing ? $existing->id : (string) \Illuminate\Support\Str::uuid();

                // Extract images from renderer (renders of the complex) and plan (floor plan)
                $images = [];
                if (!empty($item['renderer']) && is_array($item['renderer'])) {
                    foreach ($item['renderer'] as $url) {
                        if (is_string($url) && !empty($url)) {
                            $images[] = trim($url);
                        }
                    }
                }
                // Include plan images if no renderer images
                if (empty($images) && !empty($item['plan']) && is_array($item['plan'])) {
                    foreach ($item['plan'] as $url) {
                        if (is_string($url) && !empty($url)) {
                            $images[] = trim($url);
                        }
                    }
                }
                $imagesJson = !empty($images) ? json_encode(array_values($images)) : null;

                // Extract address (blocks.address is an array in the feed)
                $address = null;
                if (!empty($item['address'])) {
                    if (is_array($item['address'])) {
                        $address = implode(', ', array_filter($item['address']));
                    } elseif (is_string($item['address'])) {
                        $address = $item['address'];
                    }
                }

                // Generate slug from name
                $slug = \Illuminate\Support\Str::slug($name);

                $blockData = [
                    'id' => $id,
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $item['description'] ?? null,
                    'address' => $address,
                    'district_id' => $districtId,
                    'builder_id' => $builderId,
                    'source_id' => $sourceId,
                    'external_id' => $externalId,
                    'lat' => $lat,
                    'lng' => $lng,
                    'images' => $imagesJson,
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
                    'external_id' => $externalId ?? 'unknown',
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'item_keys' => array_keys($item ?? []),
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

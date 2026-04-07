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

                $planJson = !empty($item['plan']) && is_array($item['plan'])
                    ? json_encode(array_values($item['plan']))
                    : null;
                $rendererJson = !empty($item['renderer']) && is_array($item['renderer'])
                    ? json_encode(array_values($item['renderer']))
                    : null;

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
                    'crm_id' => isset($item['crm_id']) ? (string) $item['crm_id'] : null,
                    'lat' => $lat,
                    'lng' => $lng,
                    'images' => $imagesJson,
                    'plan' => $planJson,
                    'renderer' => $rendererJson,
                    'created_at' => now(),
                ];

                if ($existing) {
                    // Update existing
                    unset($blockData['id']); // Don't update primary key
                    unset($blockData['created_at']); // Don't update created_at
                    // Don't overwrite existing images if feed has none
                    if ($imagesJson === null && !empty($existing->images)) {
                        unset($blockData['images']);
                    }
                    if ($planJson === null && !empty($existing->plan)) {
                        unset($blockData['plan']);
                    }
                    if ($rendererJson === null && !empty($existing->renderer)) {
                        unset($blockData['renderer']);
                    }
                    DB::table('blocks')
                        ->where('id', $existing->id)
                        ->update($blockData);
                    $stats['updated']++;
                } else {
                    // Insert new
                    DB::table('blocks')->insert($blockData);
                    $stats['created']++;
                }

                // Populate block_subway pivot from feed subway array
                if (!empty($item['subway']) && is_array($item['subway'])) {
                    DB::table('block_subway')->where('block_id', $id)->delete();
                    foreach ($item['subway'] as $entry) {
                        $feedSubwayId = $entry['subway_id'] ?? null;
                        if (!$feedSubwayId) continue;
                        // subways.id = external feed _id (imported by ReferenceImporter)
                        $exists = DB::table('subways')->where('id', $feedSubwayId)->exists();
                        if (!$exists) continue;
                        DB::table('block_subway')->insertOrIgnore([
                            'block_id'      => $id,
                            'subway_id'     => $feedSubwayId,
                            'distance_time' => (int) ($entry['distance_time'] ?? 0),
                            'distance_type' => (int) ($entry['distance_type'] ?? 1),
                        ]);
                    }
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

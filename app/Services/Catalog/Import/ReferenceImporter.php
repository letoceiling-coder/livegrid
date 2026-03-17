<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Import reference tables (regions, subways, builders, finishings, building_types)
 * These tables have no foreign keys and can be imported in any order
 */
class ReferenceImporter
{
    /**
     * Import reference data from JSON file
     *
     * @param string $filePath Path to JSON file
     * @param string $tableName Table name (regions, subways, builders, finishings, building_types)
     * @return array Statistics: ['processed' => int, 'created' => int, 'updated' => int, 'errors' => int]
     */
    public function importFromFile(string $filePath, string $tableName): array
    {
        if (!file_exists($filePath)) {
            Log::warning("Reference file not found", ['file' => $filePath, 'table' => $tableName]);
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

        return $this->import($data, $tableName);
    }

    /**
     * Import reference data from array
     *
     * @param array $data Array of reference items
     * @param string $tableName Table name
     * @return array Statistics
     */
    public function import(array $data, string $tableName): array
    {
        $stats = ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0];

        Log::info("Starting reference import", [
            'table' => $tableName,
            'total_items' => count($data),
        ]);

        foreach ($data as $item) {
            try {
                $id = $item['_id'] ?? $item['id'] ?? null;
                $name = $item['name'] ?? '';

                if (!$id || !$name) {
                    Log::warning('Invalid reference item', [
                        'table' => $tableName,
                        'item' => $item,
                    ]);
                    $stats['errors']++;
                    continue;
                }

                // Check if exists
                $existing = DB::table($tableName)->where('id', $id)->first();

                if ($existing) {
                    // Update if name changed
                    if ($existing->name !== $name) {
                        DB::table($tableName)->where('id', $id)->update(['name' => $name]);
                        $stats['updated']++;
                    }
                } else {
                    // Insert new
                    DB::table($tableName)->insert([
                        'id' => $id,
                        'name' => $name,
                    ]);
                    $stats['created']++;
                }

                $stats['processed']++;
            } catch (\Exception $e) {
                Log::error('Failed to import reference item', [
                    'table' => $tableName,
                    'error' => $e->getMessage(),
                    'item' => $item,
                ]);
                $stats['errors']++;
            }
        }

        Log::info("Reference import finished", [
            'table' => $tableName,
            'stats' => $stats,
        ]);

        return $stats;
    }
}

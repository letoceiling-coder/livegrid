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

                $record = ['id' => $id, 'name' => $name];

                // rooms table has extra fields: crm_id, name_one, room_category
                if ($tableName === 'rooms') {
                    $crmId = isset($item['crm_id']) ? (int) $item['crm_id'] : null;
                    $nameOne = $item['name_one'] ?? null;
                    $record['crm_id'] = $crmId;
                    $record['name_one'] = $nameOne;
                    $record['room_category'] = $this->resolveRoomCategory($nameOne, $crmId);
                }

                // Check if exists
                $existing = DB::table($tableName)->where('id', $id)->first();

                if ($existing) {
                    $update = array_diff_key($record, ['id' => true]);
                    DB::table($tableName)->where('id', $id)->update($update);
                    $stats['updated']++;
                } else {
                    DB::table($tableName)->insert($record);
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

    /**
     * Determine standard room category (0-4) from room name or crm_id.
     * 0 = Studio, 1 = 1-room, 2 = 2-room, 3 = 3-room, 4 = 4+
     */
    private function resolveRoomCategory(?string $nameOne, ?int $crmId): ?int
    {
        if ($nameOne !== null) {
            $lower = mb_strtolower($nameOne);
            if (str_contains($lower, 'студ') || str_contains($lower, 'studio')) return 0;
            if (preg_match('/^1[-\s]|одн/u', $lower)) return 1;
            if (preg_match('/^2[-\s]|двух/u', $lower)) return 2;
            if (preg_match('/^3[-\s]|трёх|трех/u', $lower)) return 3;
            if (preg_match('/^[4-9]|четыр|свободн|апарт|пентх/u', $lower)) return 4;
        }

        // Fallback: if crm_id <= 4, treat it as room count directly
        if ($crmId !== null && $crmId >= 0 && $crmId <= 4) {
            return $crmId;
        }

        return null;
    }
}

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
                    // TrendAgent feed may not have name_one — fall back to name
                    $nameOne = $item['name_one'] ?? $item['name'] ?? null;
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
     *
     * Handles TrendAgent room types:
     *   0=Студии, 1=1-к.кв, 2=2-к.кв, 3=3-к.кв, 4+=4-к.кв+
     *   22=2Е-к.кв(euro 2), 23=3Е-к.кв(euro 3), 24=4Е-к.кв, 25=5Е-к.кв
     *   30=Коттеджи, 40=Таунхаусы, 60=Своб.план., 100=Комнаты
     */
    private function resolveRoomCategory(?string $nameOne, ?int $crmId): ?int
    {
        if ($nameOne !== null) {
            $lower = mb_strtolower($nameOne);

            // Studio
            if (str_contains($lower, 'студ') || str_contains($lower, 'studio')) return 0;
            // Rooms
            if (str_contains($lower, 'комнат')) return 0;
            // Free planning — treat as studio/0
            if (str_contains($lower, 'своб') || str_contains($lower, 'план')) return 0;

            // European room types: "2Е-к.кв", "3Е-к.кв" etc.
            if (preg_match('/^(\d+)[еeЕE]/iu', $lower, $m)) {
                $n = (int) $m[1];
                if ($n <= 1) return 1;
                if ($n === 2) return 2;
                if ($n === 3) return 3;
                return 4;
            }

            // Standard: "1-к.кв", "2-к.кв", "1 спальня", "2 спальни" etc.
            if (preg_match('/^(\d+)/u', $lower, $m)) {
                $n = (int) $m[1];
                if ($n === 0) return 0;
                if ($n === 1) return 1;
                if ($n === 2) return 2;
                if ($n === 3) return 3;
                return 4;
            }

            // Named types
            if (preg_match('/одн/u', $lower)) return 1;
            if (preg_match('/двух|двуx/u', $lower)) return 2;
            if (preg_match('/трёх|трех/u', $lower)) return 3;

            // Cottages, townhouses, commercial = 4+
            if (preg_match('/котт|таун|ком\.|пом\.|апарт|пентх/u', $lower)) return 4;
        }

        // Fallback via crm_id when no name match
        if ($crmId !== null) {
            if ($crmId === 0) return 0;
            if ($crmId === 1) return 1;
            if ($crmId === 2) return 2;
            if ($crmId === 3) return 3;
            if ($crmId >= 4 && $crmId <= 7) return 4;
            // European types by crm_id range
            if ($crmId === 22) return 2;
            if ($crmId === 23) return 3;
            if ($crmId >= 24) return 4;
        }

        return null;
    }
}

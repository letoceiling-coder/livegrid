<?php

namespace App\Services\Catalog\Import;

use App\Services\Catalog\Import\DTO\ApartmentDTO;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Production-grade upsert service using DB::table() for bulk operations
 * No Eloquent - direct database operations for performance
 */
class UpsertService
{
    private const CHUNK_SIZE = 100;
    private const INSERT_CHUNK_SIZE = 200; // Larger chunks for inserts
    private const UPDATE_CHUNK_SIZE = 100; // Smaller chunks for updates

    public function __construct(
        private AttributeMapper $attributeMapper,
    ) {
    }

    /**
     * Upsert single apartment (for compatibility)
     *
     * @param ApartmentDTO $dto
     * @param Carbon $importTime
     * @return string Apartment ID (UUID)
     */
    public function upsert(ApartmentDTO $dto, Carbon $importTime): string
    {
        $data = $dto->toArray();
        $data['id'] = $this->generateUuid();
        $data['is_active'] = true;
        $data['last_seen_at'] = $importTime;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        // Check if exists
        $existing = DB::table('apartments')
            ->where('source_id', $dto->sourceId)
            ->where('external_id', $dto->externalId)
            ->first();

        if ($existing) {
            // Update existing
            DB::table('apartments')
                ->where('id', $existing->id)
                ->update($data);

            // Update attributes
            $this->upsertAttributes($existing->id, $dto->attributes);

            return $existing->id;
        }

        // Insert new - use upsert for idempotency (handles race conditions)
        try {
            DB::table('apartments')->insert($data);
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle duplicate key error (race condition or re-run)
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate entry')) {
                // Record already exists, fetch and update
                $existing = DB::table('apartments')
                    ->where('source_id', $dto->sourceId)
                    ->where('external_id', $dto->externalId)
                    ->first();
                
                if ($existing) {
                    unset($data['id'], $data['created_at']); // Don't update id or created_at
                    DB::table('apartments')
                        ->where('id', $existing->id)
                        ->update($data);
                    $this->upsertAttributes($existing->id, $dto->attributes);
                    return $existing->id;
                }
            }
            throw $e;
        }

        // Insert attributes
        $this->upsertAttributes($data['id'], $dto->attributes);

        return $data['id'];
    }

    /**
     * Bulk upsert apartments in chunks
     *
     * @param array $dtos Array of ApartmentDTO
     * @param Carbon $importTime
     * @return array Statistics: ['created' => int, 'updated' => int, 'errors' => int, 'skipped' => int, 'processed_external_ids' => array]
     */
    public function bulkUpsert(array $dtos, Carbon $importTime): array
    {
        $stats = [
            'created' => 0,
            'updated' => 0,
            'errors' => 0,
            'skipped' => 0,
            'unchanged' => 0,
            'processed_external_ids' => [], // Track all processed external_ids for bulk last_seen_at update
        ];

        // Process in chunks
        $chunks = array_chunk($dtos, self::CHUNK_SIZE);

        foreach ($chunks as $chunk) {
            try {
                $result = $this->processChunk($chunk, $importTime);
                $stats['created'] += $result['created'];
                $stats['updated'] += $result['updated'];
                $stats['errors'] += $result['errors'];
                $stats['skipped'] += $result['skipped'] ?? 0;
                $stats['unchanged'] += $result['unchanged'] ?? 0;
                // Collect processed external_ids from chunk
                if (!empty($result['processed_external_ids'] ?? [])) {
                    $stats['processed_external_ids'] = array_merge($stats['processed_external_ids'], $result['processed_external_ids']);
                }
            } catch (\Exception $e) {
                Log::error('Failed to process chunk', [
                    'error' => $e->getMessage(),
                    'chunk_size' => count($chunk),
                    'trace' => $e->getTraceAsString(),
                ]);
                $stats['errors'] += count($chunk);
                // Continue processing other chunks - don't fail entire import
            }
        }

        return $stats;
    }

    /**
     * Process a chunk of DTOs
     *
     * @param array $dtos Chunk of ApartmentDTO
     * @param Carbon $importTime
     * @return array Statistics
     */
    private function processChunk(array $dtos, Carbon $importTime): array
    {
        $chunkStartTime = microtime(true);
        $stats = ['created' => 0, 'updated' => 0, 'errors' => 0, 'skipped' => 0, 'unchanged' => 0, 'processed_external_ids' => []];
        $now = now();

        // Prepare data arrays
        $apartmentsToInsert = [];
        $apartmentsToUpdate = [];

        // Pre-fetch existing apartments for this chunk in single query (with all comparison fields)
        $existing = $this->prefetchExisting($dtos);

        // Pre-fetch building and block IDs by external_id for FK validation
        $buildingExternalIds = array_unique(array_map(fn($dto) => $dto->buildingId, $dtos));
        $blockExternalIds = array_unique(array_map(fn($dto) => $dto->blockId, $dtos));
        
        // Map external_id -> id for buildings
        $buildingIdMap = DB::table('buildings')
            ->whereIn('external_id', $buildingExternalIds)
            ->pluck('id', 'external_id')
            ->toArray();
        
        // Map external_id -> id for blocks
        $blockIdMap = DB::table('blocks')
            ->whereIn('external_id', $blockExternalIds)
            ->pluck('id', 'external_id')
            ->toArray();

        // Prepare records with FK validation
        foreach ($dtos as $dto) {
            try {
                // Find building.id by building.external_id
                $buildingId = $buildingIdMap[$dto->buildingId] ?? null;
                if (!$buildingId) {
                    Log::warning('Apartment building_id not found, skipping', [
                        'source_id' => $dto->sourceId,
                        'external_id' => $dto->externalId,
                        'feed_building_id' => $dto->buildingId,
                    ]);
                    $stats['skipped']++;
                    continue;
                }

                // Find block.id by block.external_id
                $blockId = $blockIdMap[$dto->blockId] ?? null;
                if (!$blockId) {
                    Log::warning('Apartment block_id not found, skipping', [
                        'source_id' => $dto->sourceId,
                        'external_id' => $dto->externalId,
                        'feed_block_id' => $dto->blockId,
                    ]);
                    $stats['skipped']++;
                    continue;
                }

                $key = $dto->sourceId . ':' . $dto->externalId;
                $data = $dto->toArray();
                
                // Replace feed external_ids with database UUIDs
                $data['building_id'] = $buildingId;
                $data['block_id'] = $blockId;
                
                // Find builder_id - in reference tables, id = external_id (feed _id)
                if ($dto->builderId) {
                    // For reference tables, id = external_id (feed _id)
                    $builderId = DB::table('builders')
                        ->where('id', $dto->builderId)
                        ->value('id');
                    $data['builder_id'] = $builderId;
                }
                
                $data['is_active'] = true;
                $data['last_seen_at'] = $importTime;
                $data['updated_at'] = $now;

                // Use external_id as ID for new apartments (string ID)
                if (!isset($existing[$key])) {
                    $data['id'] = $dto->externalId; // Use external_id as primary key
                    $data['created_at'] = $now;
                    $apartmentsToInsert[] = $data;
                    $stats['processed_external_ids'][] = $dto->externalId;
                } else {
                    // Check if data has changed
                    $existingData = $existing[$key];
                    if ($this->isDataUnchanged($data, $existingData)) {
                        // Data unchanged - track external_id for bulk last_seen_at update later
                        // Don't update row-by-row - will be done in bulk after all chunks
                        $stats['processed_external_ids'][] = $dto->externalId;
                        $stats['unchanged']++;
                    } else {
                        // Data changed - full update (includes last_seen_at)
                        unset($data['id']);
                        $apartmentsToUpdate[] = $data;
                        $stats['processed_external_ids'][] = $dto->externalId;
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to prepare apartment record', [
                    'error' => $e->getMessage(),
                    'source_id' => $dto->sourceId ?? null,
                    'external_id' => $dto->externalId ?? 'unknown',
                    'payload' => json_encode($dto->toArray()),
                    'trace' => $e->getTraceAsString(),
                ]);
                $stats['errors']++;
            }
        }

        // Process inserts in batches (larger chunks for better performance)
        if (!empty($apartmentsToInsert)) {
            $insertChunks = array_chunk($apartmentsToInsert, self::INSERT_CHUNK_SIZE);
            foreach ($insertChunks as $insertChunk) {
                try {
                    DB::table('apartments')->insert($insertChunk);
                    $stats['created'] += count($insertChunk);
                } catch (\Exception $e) {
                    Log::error('Failed to insert chunk', [
                        'error' => $e->getMessage(),
                        'chunk_size' => count($insertChunk),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    $stats['errors'] += count($insertChunk);
                }
            }
        }

        // Process updates in batches (smaller chunks for better control)
        if (!empty($apartmentsToUpdate)) {
            $updateChunks = array_chunk($apartmentsToUpdate, self::UPDATE_CHUNK_SIZE);
            foreach ($updateChunks as $updateChunk) {
                try {
                    // Batch update in transaction for better performance
                    DB::transaction(function () use ($updateChunk, &$stats) {
                        foreach ($updateChunk as $data) {
                            // Extract unique key before modifying data
                            $sourceId = $data['source_id'];
                            $externalId = $data['external_id'];
                            
                            // Create update data without unique keys
                            $updateData = $data;
                            unset($updateData['source_id'], $updateData['external_id']);
                            
                            // Update single record
                            DB::table('apartments')
                                ->where('source_id', $sourceId)
                                ->where('external_id', $externalId)
                                ->update($updateData);
                        }
                        $stats['updated'] += count($updateChunk);
                    });
                } catch (\Exception $e) {
                    Log::error('Failed to update chunk', [
                        'error' => $e->getMessage(),
                        'chunk_size' => count($updateChunk),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    $stats['errors'] += count($updateChunk);
                }
            }
        }

        // Note: last_seen_at update for unchanged records is done in bulk after all chunks
        // See FeedImporter::updateLastSeenAtForProcessed() method

        // TEMPORARILY DISABLED: Skip attributes upsert for speed
        // $this->bulkUpsertAttributes($existingIds);

        $chunkDurationMs = round((microtime(true) - $chunkStartTime) * 1000, 2);
        $chunkDurationSec = round($chunkDurationMs / 1000, 3);
        $recordsPerSecond = count($dtos) > 0 ? round(count($dtos) / $chunkDurationSec, 2) : 0;
        
        Log::info("Chunk processed", [
            'chunk_size' => count($dtos),
            'duration_sec' => $chunkDurationSec,
            'duration_ms' => $chunkDurationMs,
            'inserted' => $stats['created'],
            'updated' => $stats['updated'],
            'unchanged' => $stats['unchanged'] ?? 0,
            'skipped' => $stats['skipped'],
            'errors' => $stats['errors'],
            'records_per_second' => $recordsPerSecond,
        ]);

        return $stats;
    }

    /**
     * Pre-fetch existing apartments for chunk with all fields needed for comparison
     * Fetches important fields to compare and skip unchanged records
     *
     * @param array $dtos
     * @return array Map of 'source_id:external_id' => existing record data
     */
    private function prefetchExisting(array $dtos): array
    {
        if (empty($dtos)) {
            return [];
        }

        // Get unique source_id (should be same for all in chunk, but handle multiple)
        $sourceIds = array_unique(array_map(fn($dto) => $dto->sourceId, $dtos));
        $externalIds = array_unique(array_map(fn($dto) => $dto->externalId, $dtos));

        // Build lookup map for exact (source_id, external_id) combinations
        $lookupMap = [];
        foreach ($dtos as $dto) {
            $key = $dto->sourceId . ':' . $dto->externalId;
            $lookupMap[$key] = true;
        }

        // Fetch all important fields for comparison
        // Select only fields that we compare to avoid loading unnecessary data
        $existing = DB::table('apartments')
            ->whereIn('source_id', $sourceIds)
            ->whereIn('external_id', $externalIds)
            ->select([
                'source_id',
                'external_id',
                'building_id',
                'block_id',
                'builder_id',
                'price',
                'rooms_count',
                'floor',
                'floors',
                'area_total',
                'area_kitchen',
                'area_rooms_total',
                'area_balconies',
                'lat',
                'lng',
                'block_name',
                'builder_name',
                'district_name',
            ])
            ->get()
            ->filter(function ($item) use ($lookupMap) {
                $key = $item->source_id . ':' . $item->external_id;
                return isset($lookupMap[$key]);
            })
            ->mapWithKeys(function ($item) {
                $key = $item->source_id . ':' . $item->external_id;
                return [$key => (array) $item];
            })
            ->toArray();

        return $existing;
    }

    /**
     * Check if incoming data is identical to existing data
     * Compares only important fields, ignoring timestamps and status fields
     *
     * @param array $incomingData New data from DTO
     * @param array $existingData Existing data from database
     * @return bool True if data is unchanged
     */
    private function isDataUnchanged(array $incomingData, array $existingData): bool
    {
        // Fields to compare (important business data)
        $fieldsToCompare = [
            'building_id',
            'block_id',
            'builder_id',
            'price',
            'rooms_count',
            'floor',
            'floors',
            'area_total',
            'area_kitchen',
            'area_rooms_total',
            'area_balconies',
            'lat',
            'lng',
            'block_name',
            'builder_name',
            'district_name',
        ];

        foreach ($fieldsToCompare as $field) {
            $incomingValue = $incomingData[$field] ?? null;
            $existingValue = $existingData[$field] ?? null;

            // Normalize values for comparison
            // Convert to string for numeric comparison (handle float precision)
            $incomingNormalized = $this->normalizeValueForComparison($incomingValue);
            $existingNormalized = $this->normalizeValueForComparison($existingValue);

            if ($incomingNormalized !== $existingNormalized) {
                return false; // Data has changed
            }
        }

        return true; // All fields are identical
    }

    /**
     * Normalize value for comparison (handle null, float precision, etc.)
     *
     * @param mixed $value
     * @return string|null
     */
    private function normalizeValueForComparison($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        // For numeric values, round to 2 decimal places to handle float precision issues
        if (is_numeric($value)) {
            // Handle integers separately (no decimal rounding)
            if (is_int($value) || (is_string($value) && ctype_digit($value))) {
                return (string) (int) $value;
            }
            // For floats, round to 2 decimal places
            return (string) round((float) $value, 2);
        }

        // For strings, trim and compare
        $normalized = trim((string) $value);
        return $normalized === '' ? null : $normalized;
    }

    /**
     * Upsert attributes for a single apartment
     */
    private function upsertAttributes(string $apartmentId, array $attributes): void
    {
        if (empty($attributes)) {
            return;
        }

        $records = $this->attributeMapper->prepareAttributeRecords($apartmentId, $attributes);

        if (empty($records)) {
            return;
        }

        // Use upsert to handle duplicates
        foreach ($records as $record) {
            DB::table('apartment_attributes')->upsert(
                [$record],
                ['apartment_id', 'attribute_id'],
                [
                    'value_int',
                    'value_float',
                    'value_string',
                    'value_bool',
                    'value_json',
                    'updated_at',
                ]
            );
        }
    }

    /**
     * Bulk upsert attributes
     */
    private function bulkUpsertAttributes(array $apartmentAttributes): void
    {
        $allRecords = [];

        foreach ($apartmentAttributes as $apartmentId => $attributes) {
            if (empty($attributes)) {
                continue;
            }

            $records = $this->attributeMapper->prepareAttributeRecords($apartmentId, $attributes);
            $allRecords = array_merge($allRecords, $records);
        }

        if (empty($allRecords)) {
            return;
        }

        // Process attributes in chunks with error handling
        $chunks = array_chunk($allRecords, self::CHUNK_SIZE);

        foreach ($chunks as $chunk) {
            try {
                DB::table('apartment_attributes')->upsert(
                    $chunk,
                    ['apartment_id', 'attribute_id'], // Unique constraint prevents duplicates
                    [
                        'value_int',
                        'value_float',
                        'value_string',
                        'value_bool',
                        'value_json',
                        'updated_at',
                    ]
                );
            } catch (\Exception $e) {
                Log::warning('Failed to upsert attribute chunk', [
                    'error' => $e->getMessage(),
                    'chunk_size' => count($chunk),
                ]);
                // Continue with next chunk - don't fail entire import
            }
        }
    }

    /**
     * Generate UUID for apartment ID
     */
    private function generateUuid(): string
    {
        return (string) Str::uuid();
    }
}

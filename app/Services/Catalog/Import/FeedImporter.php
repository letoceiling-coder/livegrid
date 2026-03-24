<?php

namespace App\Services\Catalog\Import;

use App\Services\Catalog\Import\DTO\ApartmentDTO;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Production-grade feed importer with chunk processing and streaming
 */
class FeedImporter
{
    private const CHUNK_SIZE = 100;

    public function __construct(
        private FeedMapper $feedMapper,
        private UpsertService $upsertService,
        private ArchiveService $archiveService,
        private ReferenceImporter $referenceImporter,
        private BlockImporter $blockImporter,
        private BuildingImporter $buildingImporter,
    ) {
    }

    /**
     * Import apartments from JSON feed with chunk processing
     *
     * @param array $feedData Array of apartment data
     * @param int $sourceId Source ID from sources table
     * @param Carbon|null $importStartedAt Optional: import start time (for idempotency)
     * @return array Statistics: ['processed' => int, 'created' => int, 'updated' => int, 'archived' => int, 'errors' => int, 'completed' => bool]
     */
    public function import(array $feedData, int $sourceId, ?Carbon $importStartedAt = null): array
    {
        $importStartedAt = $importStartedAt ?? Carbon::now();
        $importStartTime = microtime(true);
        $this->feedMapper->setSourceId($sourceId);

        $stats = [
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'unchanged' => 0,
            'archived' => 0,
            'errors' => 0,
            'skipped' => 0,
            'completed' => false,
        ];

        $processedExternalIds    = [];
        $allProcessedExternalIds = [];
        $importCompleted = false;

        Log::info("Starting apartments import", [
            'source_id' => $sourceId,
            'total_items' => count($feedData),
            'import_started_at' => $importStartedAt->toDateTimeString(),
        ]);

        // Process feed data in chunks to avoid memory overflow
        $chunks = array_chunk($feedData, self::CHUNK_SIZE);

        foreach ($chunks as $chunkIndex => $chunk) {
            $chunkDtos = [];

            foreach ($chunk as $rawItem) {
                try {
                    $dto = $this->feedMapper->map($rawItem);
                    $chunkDtos[] = $dto;
                    $processedExternalIds[] = $dto->externalId;
                    $stats['processed']++;
                } catch (\InvalidArgumentException $e) {
                    $externalId = $rawItem['_id'] ?? 'unknown';
                    Log::warning('Failed to map apartment data', [
                        'error' => $e->getMessage(),
                        'source_id' => $sourceId,
                        'external_id' => $externalId,
                        'raw_data_keys' => array_keys($rawItem ?? []),
                        'payload_sample' => json_encode(array_slice($rawItem ?? [], 0, 5)),
                    ]);
                    $stats['errors']++;
                } catch (\Exception $e) {
                    $externalId = $rawItem['_id'] ?? 'unknown';
                    Log::error('Unexpected error mapping apartment', [
                        'error' => $e->getMessage(),
                        'source_id' => $sourceId,
                        'external_id' => $externalId,
                        'trace' => $e->getTraceAsString(),
                    ]);
                    $stats['errors']++;
                }
            }

            // Bulk upsert chunk
            if (!empty($chunkDtos)) {
                try {
                    $chunkStats = $this->upsertService->bulkUpsert($chunkDtos, $importStartedAt);
                    $stats['created'] += $chunkStats['created'];
                    $stats['updated'] += $chunkStats['updated'];
                    $stats['errors'] += $chunkStats['errors'];
                    $stats['skipped'] += $chunkStats['skipped'] ?? 0;
                    $stats['unchanged'] += $chunkStats['unchanged'] ?? 0;
                    
                    // Collect processed external_ids for bulk last_seen_at update
                    if (!empty($chunkStats['processed_external_ids'] ?? [])) {
                        $allProcessedExternalIds = array_merge($allProcessedExternalIds, $chunkStats['processed_external_ids']);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to upsert chunk', [
                        'error' => $e->getMessage(),
                        'source_id' => $sourceId,
                        'chunk_index' => $chunkIndex,
                        'chunk_size' => count($chunkDtos),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    $stats['errors'] += count($chunkDtos);
                    // Continue processing other chunks
                }
            }

            // Clear memory
            unset($chunkDtos);
            if (function_exists('gc_collect_cycles')) {
                gc_collect_cycles();
            }
        }

        // Mark import as completed only if no critical errors
        $importCompleted = ($stats['errors'] / max($stats['processed'], 1)) < 0.1; // Less than 10% errors

        // Bulk update last_seen_at for all processed apartments (including unchanged)
        // This prevents archiving and is much faster than row-by-row updates
        if (!empty($allProcessedExternalIds)) {
            $this->updateLastSeenAtForProcessed($allProcessedExternalIds, $sourceId, $importStartedAt);
        }

        // Reactivate apartments that are back in feed
        if (!empty($processedExternalIds)) {
            $this->archiveService->reactivate($processedExternalIds, $sourceId);
        }

        // Archive apartments not seen in this import ONLY if import completed successfully
        if ($importCompleted) {
            $stats['archived'] = $this->archiveService->archive($importStartedAt, $sourceId);
        } else {
            Log::warning('Import completed with errors - skipping archive', [
                'source_id' => $sourceId,
                'error_rate' => round(($stats['errors'] / max($stats['processed'], 1)) * 100, 2) . '%',
            ]);
            $stats['archived'] = 0;
        }

        $stats['completed'] = $importCompleted;

        $totalDuration = round(microtime(true) - $importStartTime, 3);
        $avgTimePer100Records = $stats['processed'] > 0 ? round(($totalDuration / $stats['processed']) * 100, 3) : 0;

        Log::info("Apartments import finished", [
            'source_id' => $sourceId,
            'total_duration_sec' => $totalDuration,
            'total_processed' => $stats['processed'],
            'avg_time_per_100_records_sec' => $avgTimePer100Records,
            'stats' => $stats,
            'import_started_at' => $importStartedAt->toDateTimeString(),
        ]);

        return $stats;
    }

    /**
     * Import full feed in correct order: references → blocks → buildings → apartments
     *
     * @param string $feedDir Directory containing feed JSON files
     * @param int $sourceId Source ID from sources table
     * @return array Statistics
     */
    public function importFullFeed(string $feedDir, int $sourceId): array
    {
        $importStartedAt = Carbon::now();
        $importStartTime = microtime(true);
        $allStats = [];
        $stageTimings = [];

        Log::info("START: Full feed import", [
            'feed_dir' => $feedDir,
            'source_id' => $sourceId,
            'import_started_at' => $importStartedAt->toDateTimeString(),
        ]);

        // Step 1: Import reference tables (no dependencies)
        $referenceStartTime = microtime(true);
        Log::info("START: Reference tables import");
        
        $referenceFiles = [
            'regions.json' => 'regions',
            'subways.json' => 'subways',
            'builders.json' => 'builders',
            'finishings.json' => 'finishings',
            'buildingtypes.json' => 'building_types',
            'room.json' => 'rooms',   // TrendAgent naming
            'rooms.json' => 'rooms',  // Alternative naming
        ];

        $referenceTotalProcessed = 0;
        foreach ($referenceFiles as $file => $table) {
            $filePath = rtrim($feedDir, '/') . '/' . $file;
            if (file_exists($filePath)) {
                $stats = $this->referenceImporter->importFromFile($filePath, $table);
                $allStats["reference_{$table}"] = $stats;
                $referenceTotalProcessed += $stats['processed'] ?? 0;
            }
        }

        $referenceDuration = round(microtime(true) - $referenceStartTime, 3);
        $stageTimings['references'] = $referenceDuration;
        Log::info("END: Reference tables import", [
            'duration_sec' => $referenceDuration,
            'total_processed' => $referenceTotalProcessed,
        ]);

        // Step 2: Import blocks (depends on regions, builders)
        $blocksStartTime = microtime(true);
        Log::info("START: Blocks import");
        
        $blocksPath = rtrim($feedDir, '/') . '/blocks.json';
        if (file_exists($blocksPath)) {
            $stats = $this->blockImporter->importFromFile($blocksPath, $sourceId);
            $allStats['blocks'] = $stats;
        } else {
            $allStats['blocks'] = ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0, 'skipped' => 0];
        }

        $blocksDuration = round(microtime(true) - $blocksStartTime, 3);
        $stageTimings['blocks'] = $blocksDuration;
        Log::info("END: Blocks import", [
            'duration_sec' => $blocksDuration,
            'processed' => $allStats['blocks']['processed'] ?? 0,
            'created' => $allStats['blocks']['created'] ?? 0,
            'updated' => $allStats['blocks']['updated'] ?? 0,
        ]);

        // Step 3: Import buildings (depends on blocks, building_types)
        $buildingsStartTime = microtime(true);
        Log::info("START: Buildings import");
        
        $buildingsPath = rtrim($feedDir, '/') . '/buildings.json';
        if (file_exists($buildingsPath)) {
            $stats = $this->buildingImporter->importFromFile($buildingsPath, $sourceId);
            $allStats['buildings'] = $stats;
        } else {
            $allStats['buildings'] = ['processed' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0, 'skipped' => 0];
        }

        $buildingsDuration = round(microtime(true) - $buildingsStartTime, 3);
        $stageTimings['buildings'] = $buildingsDuration;
        Log::info("END: Buildings import", [
            'duration_sec' => $buildingsDuration,
            'processed' => $allStats['buildings']['processed'] ?? 0,
            'created' => $allStats['buildings']['created'] ?? 0,
            'updated' => $allStats['buildings']['updated'] ?? 0,
            'skipped' => $allStats['buildings']['skipped'] ?? 0,
        ]);

        // Step 4: Import apartments (depends on buildings, blocks)
        $apartmentsStartTime = microtime(true);
        Log::info("START: Apartments import");
        
        $apartmentsPath = rtrim($feedDir, '/') . '/apartments.json';
        if (file_exists($apartmentsPath)) {
            $stats = $this->importFromFile($apartmentsPath, $sourceId);
            $allStats['apartments'] = $stats;
        } else {
            $allStats['apartments'] = ['processed' => 0, 'created' => 0, 'updated' => 0, 'unchanged' => 0, 'archived' => 0, 'errors' => 0, 'skipped' => 0, 'completed' => false];
        }

        $apartmentsDuration = round(microtime(true) - $apartmentsStartTime, 3);
        $stageTimings['apartments'] = $apartmentsDuration;
        Log::info("END: Apartments import", [
            'duration_sec' => $apartmentsDuration,
            'processed' => $allStats['apartments']['processed'] ?? 0,
            'created' => $allStats['apartments']['created'] ?? 0,
            'updated' => $allStats['apartments']['updated'] ?? 0,
            'skipped' => $allStats['apartments']['skipped'] ?? 0,
        ]);

        // Calculate global stats
        $totalDuration = round(microtime(true) - $importStartTime, 3);
        $totalProcessed = ($allStats['apartments']['processed'] ?? 0);
        $avgTimePer100Records = $totalProcessed > 0 ? round(($apartmentsDuration / $totalProcessed) * 100, 3) : 0;
        
        // Find slowest stage
        $slowestStage = 'none';
        $slowestDuration = 0;
        foreach ($stageTimings as $stage => $duration) {
            if ($duration > $slowestDuration) {
                $slowestDuration = $duration;
                $slowestStage = $stage;
            }
        }

        Log::info("END: Full feed import", [
            'source_id' => $sourceId,
            'total_duration_sec' => $totalDuration,
            'stage_timings' => $stageTimings,
            'slowest_stage' => $slowestStage,
            'slowest_stage_duration_sec' => $slowestDuration,
            'total_processed' => $totalProcessed,
            'avg_time_per_100_records_sec' => $avgTimePer100Records,
            'stats' => $allStats,
        ]);

        // Dispatch search index rebuild + invalidate caches after full import
        try {
            \App\Services\CacheInvalidator::all();
            \App\Jobs\SyncComplexesSearchJob::dispatch();
            Log::info("complexes_search sync job dispatched after import");
        } catch (\Throwable $e) {
            Log::warning("complexes_search sync dispatch failed", ['error' => $e->getMessage()]);
        }

        return $allStats;
    }

    /**
     * Bulk update last_seen_at for all processed apartments
     * This is much faster than updating row-by-row
     *
     * @param array $externalIds Array of external_ids that were processed
     * @param int $sourceId Source ID
     * @param Carbon $importStartedAt Import start time
     * @return int Number of updated records
     */
    private function updateLastSeenAtForProcessed(array $externalIds, int $sourceId, Carbon $importStartedAt): int
    {
        if (empty($externalIds)) {
            return 0;
        }

        // Remove duplicates
        $externalIds = array_unique($externalIds);

        // Process in chunks to avoid SQL IN clause limit (MySQL default is 1000)
        $chunkSize = 1000;
        $chunks = array_chunk($externalIds, $chunkSize);
        $totalUpdated = 0;

        foreach ($chunks as $chunk) {
            try {
                $updated = DB::table('apartments')
                    ->where('source_id', $sourceId)
                    ->whereIn('external_id', $chunk)
                    ->update([
                        'last_seen_at' => $importStartedAt,
                        'is_active' => true, // Reactivate if archived
                        'updated_at' => now(),
                    ]);
                $totalUpdated += $updated;
            } catch (\Exception $e) {
                Log::error('Failed to bulk update last_seen_at', [
                    'error' => $e->getMessage(),
                    'chunk_size' => count($chunk),
                    'source_id' => $sourceId,
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        if ($totalUpdated > 0) {
            Log::info("Bulk updated last_seen_at for {$totalUpdated} apartments", [
                'source_id' => $sourceId,
                'total_external_ids' => count($externalIds),
            ]);
        }

        return $totalUpdated;
    }

    /**
     * Import from JSON file with streaming for large files
     *
     * @param string $filePath Path to JSON file
     * @param int $sourceId Source ID from sources table
     * @return array Statistics
     */
    public function importFromFile(string $filePath, int $sourceId): array
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $fileSize = filesize($filePath);
        $fileSizeMB = round($fileSize / 1024 / 1024, 2);

        $importStartedAt = Carbon::now();
        
        Log::info("Starting file import", [
            'file' => $filePath,
            'size_mb' => $fileSizeMB,
            'source_id' => $sourceId,
            'import_started_at' => $importStartedAt->toDateTimeString(),
        ]);

        // For large files (> 50MB), use streaming JSON parser
        if ($fileSizeMB > 50) {
            return $this->importFromFileStreaming($filePath, $sourceId);
        }

        // For smaller files, load into memory
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
        }

        if (!is_array($data)) {
            throw new \InvalidArgumentException('JSON must contain an array');
        }

        return $this->import($data, $sourceId, $importStartedAt);
    }

    /**
     * Import from large file using streaming JSON parser
     *
     * @param string $filePath
     * @param int $sourceId
     * @return array Statistics
     */
    private function importFromFileStreaming(string $filePath, int $sourceId): array
    {
        $importStartedAt = Carbon::now();
        $importStartTime = microtime(true);
        $this->feedMapper->setSourceId($sourceId);

        $stats = [
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'unchanged' => 0,
            'archived' => 0,
            'errors' => 0,
            'skipped' => 0,
            'completed' => false,
        ];

        $chunk = [];
        $processedExternalIds = [];
        $allProcessedExternalIds = []; // Collect all external_ids from all chunks for bulk update
        $importCompleted = false;

        // Check if json-machine is available
        if (class_exists(\JsonMachine\Items::class)) {
            $items = \JsonMachine\Items::fromFile($filePath);

            foreach ($items as $rawItem) {
                try {
                    // Convert stdClass to array recursively if needed
                    $rawItemArray = json_decode(json_encode($rawItem), true);
                    $dto = $this->feedMapper->map($rawItemArray);
                    $chunk[] = $dto;
                    $processedExternalIds[] = $dto->externalId;
                    $stats['processed']++;

                    // Process chunk when full
                    if (count($chunk) >= self::CHUNK_SIZE) {
                        $chunkStats = $this->upsertService->bulkUpsert($chunk, $importStartedAt);
                        $stats['created'] += $chunkStats['created'];
                        $stats['updated'] += $chunkStats['updated'];
                        $stats['errors'] += $chunkStats['errors'];
                        $stats['skipped'] += $chunkStats['skipped'] ?? 0;
                        $stats['unchanged'] += $chunkStats['unchanged'] ?? 0;
                        
                        // Collect processed external_ids for bulk last_seen_at update
                        if (!empty($chunkStats['processed_external_ids'] ?? [])) {
                            $allProcessedExternalIds = array_merge($allProcessedExternalIds, $chunkStats['processed_external_ids']);
                        }
                        
                        $chunk = [];
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to process item', [
                        'error' => $e->getMessage(),
                    ]);
                    $stats['errors']++;
                }
            }

            // Process remaining chunk
            if (!empty($chunk)) {
                $chunkStats = $this->upsertService->bulkUpsert($chunk, $importStartedAt);
                $stats['created'] += $chunkStats['created'];
                $stats['updated'] += $chunkStats['updated'];
                $stats['errors'] += $chunkStats['errors'];
                $stats['skipped'] += $chunkStats['skipped'] ?? 0;
                $stats['unchanged'] += $chunkStats['unchanged'] ?? 0;
                
                // Collect processed external_ids for bulk last_seen_at update
                if (!empty($chunkStats['processed_external_ids'] ?? [])) {
                    $allProcessedExternalIds = array_merge($allProcessedExternalIds, $chunkStats['processed_external_ids']);
                }
            }

            // Mark import as completed only if no critical errors
            $importCompleted = ($stats['errors'] / max($stats['processed'], 1)) < 0.1;

            // Bulk update last_seen_at for all processed apartments (including unchanged)
            // This prevents archiving and is much faster than row-by-row updates
            if (!empty($allProcessedExternalIds)) {
                $this->updateLastSeenAtForProcessed($allProcessedExternalIds, $sourceId, $importStartedAt);
            }

            // Reactivate apartments that are back in feed
            if (!empty($processedExternalIds)) {
                $this->archiveService->reactivate($processedExternalIds, $sourceId);
            }

            // Archive apartments not seen in this import ONLY if import completed successfully
            if ($importCompleted) {
                $stats['archived'] = $this->archiveService->archive($importStartedAt, $sourceId);
            } else {
                Log::warning('Import completed with errors - skipping archive', [
                    'source_id' => $sourceId,
                    'error_rate' => round(($stats['errors'] / max($stats['processed'], 1)) * 100, 2) . '%',
                ]);
                $stats['archived'] = 0;
            }

            $stats['completed'] = $importCompleted;

            $totalDuration = round(microtime(true) - $importStartTime, 3);
            $avgTimePer100Records = $stats['processed'] > 0 ? round(($totalDuration / $stats['processed']) * 100, 3) : 0;

            Log::info("Apartments import finished (streaming)", [
                'source_id' => $sourceId,
                'total_duration_sec' => $totalDuration,
                'total_processed' => $stats['processed'],
                'avg_time_per_100_records_sec' => $avgTimePer100Records,
                'stats' => $stats,
            ]);
        } else {
            // Fallback: load file in chunks using file reading
            Log::warning('json-machine not available, using fallback method');
            return $this->importFromFile($filePath, $sourceId);
        }

        return $stats;
    }
}

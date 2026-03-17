<?php

namespace App\Services\Catalog\Import;

use App\Services\Catalog\Import\DTO\ApartmentDTO;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class FeedImporter
{
    public function __construct(
        private Normalizer $normalizer,
        private UpsertService $upsertService,
        private ArchiveService $archiveService,
    ) {
    }

    /**
     * Import apartments from JSON feed
     *
     * @param array $feedData Array of apartment data
     * @return array Statistics: ['processed' => int, 'created' => int, 'updated' => int, 'archived' => int]
     */
    public function import(array $feedData): array
    {
        $importStartTime = Carbon::now();
        $processed = 0;
        $created = 0;
        $updated = 0;

        foreach ($feedData as $rawItem) {
            try {
                $dto = $this->normalizer->normalize($rawItem);
                
                $existing = \App\Models\Catalog\Apartment::where('source', $dto->source)
                    ->where('external_id', $dto->externalId)
                    ->exists();

                $this->upsertService->upsert($dto, $importStartTime);
                $processed++;

                if ($existing) {
                    $updated++;
                } else {
                    $created++;
                }
            } catch (\InvalidArgumentException $e) {
                Log::warning('Failed to normalize apartment data', [
                    'error' => $e->getMessage(),
                    'data' => $rawItem,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to upsert apartment', [
                    'error' => $e->getMessage(),
                    'data' => $rawItem,
                ]);
            }
        }

        $archived = $this->archiveService->archive($importStartTime);

        return [
            'processed' => $processed,
            'created' => $created,
            'updated' => $updated,
            'archived' => $archived,
        ];
    }

    /**
     * Import from JSON file
     *
     * @param string $filePath
     * @return array Statistics
     */
    public function importFromFile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $content = file_get_contents($filePath);
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
        }

        if (!is_array($data)) {
            throw new \InvalidArgumentException('JSON must contain an array');
        }

        return $this->import($data);
    }
}

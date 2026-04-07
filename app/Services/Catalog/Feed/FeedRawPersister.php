<?php

namespace App\Services\Catalog\Feed;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Persists one JSON object per external_id into feed_*_raw tables after download.
 */
class FeedRawPersister
{
    private const CHUNK = 500;

    /** @var array<string, string> */
    private const FILE_TO_TABLE = [
        'blocks.json' => 'feed_blocks_raw',
        'buildings.json' => 'feed_buildings_raw',
        'apartments.json' => 'feed_apartments_raw',
    ];

    public function persistFromDownloadedFile(string $filename, string $absolutePath): void
    {
        if (! isset(self::FILE_TO_TABLE[$filename]) || ! is_readable($absolutePath)) {
            return;
        }

        $table = self::FILE_TO_TABLE[$filename];
        if (! Schema::hasTable($table)) {
            return;
        }

        if ($filename === 'apartments.json') {
            $this->persistApartmentsStreaming($absolutePath, $table);

            return;
        }

        $this->persistSmallJsonArrayFile($absolutePath, $table);
    }

    private function persistSmallJsonArrayFile(string $absolutePath, string $table): void
    {
        $content = file_get_contents($absolutePath);
        $data = json_decode($content, true);
        if (! is_array($data)) {
            return;
        }

        $rows = [];
        $now = now();
        foreach ($data as $item) {
            if (! is_array($item)) {
                continue;
            }
            $externalId = (string) ($item['_id'] ?? $item['id'] ?? '');
            if ($externalId === '') {
                continue;
            }
            $rows[] = [
                'external_id' => $externalId,
                'payload' => json_encode($item, JSON_UNESCAPED_UNICODE),
                'exported_at' => $now,
                'created_at' => $now,
            ];
            if (count($rows) >= self::CHUNK) {
                $this->upsertChunk($table, $rows);
                $rows = [];
            }
        }
        if ($rows !== []) {
            $this->upsertChunk($table, $rows);
        }
    }

    private function persistApartmentsStreaming(string $absolutePath, string $table): void
    {
        if (! class_exists(\JsonMachine\Items::class)) {
            Log::warning('FeedRawPersister: halaxa/json-machine not installed; skipping apartments raw persist');

            return;
        }

        $items = \JsonMachine\Items::fromFile($absolutePath);
        $rows = [];
        $now = now();

        foreach ($items as $rawItem) {
            $item = json_decode(json_encode($rawItem), true);
            if (! is_array($item)) {
                continue;
            }
            $externalId = (string) ($item['_id'] ?? '');
            if ($externalId === '') {
                continue;
            }
            $rows[] = [
                'external_id' => $externalId,
                'payload' => json_encode($item, JSON_UNESCAPED_UNICODE),
                'exported_at' => $now,
                'created_at' => $now,
            ];
            if (count($rows) >= self::CHUNK) {
                $this->upsertChunk($table, $rows);
                $rows = [];
            }
        }

        if ($rows !== []) {
            $this->upsertChunk($table, $rows);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function upsertChunk(string $table, array $rows): void
    {
        DB::table($table)->upsert(
            $rows,
            ['external_id'],
            ['payload', 'exported_at']
        );
    }
}

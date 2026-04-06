<?php

namespace App\Console\Commands;

use App\Models\Entity\EntityRecord;
use App\Services\Entity\EntitySearchIndexWriter;
use Illuminate\Console\Command;

/**
 * Rebuilds entity_search_index for every non-deleted entity_record from
 * fields: name, address, builder, district (when defined on the type).
 */
class SyncEntitySearchCommand extends Command
{
    protected $signature = 'entity:sync-search';

    protected $description = 'Rebuild FULLTEXT entity_search_index from name, address, builder, district';

    public function handle(EntitySearchIndexWriter $writer): int
    {
        $total = EntityRecord::query()->whereNull('deleted_at')->count();

        $this->info("Rebuilding search index for {$total} records…");

        $bar = $this->output->createProgressBar(max($total, 1));
        $bar->start();

        EntityRecord::query()
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->chunkById(500, function ($chunk) use ($writer, $bar): void {
                $writer->rebuildForRecords($chunk);
                $bar->advance($chunk->count());
            });

        $bar->finish();
        $this->newLine();
        $this->info('entity:sync-search finished.');

        return self::SUCCESS;
    }
}

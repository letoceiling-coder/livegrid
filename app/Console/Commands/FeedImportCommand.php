<?php

namespace App\Console\Commands;

use App\Services\Catalog\Import\FeedImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FeedImportCommand extends Command
{
    protected $signature = 'feed:import-safe';

    protected $description = 'Import feed JSON from storage/app/feed/raw (no truncate, full FeedImporter::importFullFeed)';

    public function handle(FeedImporter $importer): int
    {
        $this->info('📥 Safe feed import (no truncate)');
        $this->newLine();

        $source = DB::table('sources')->where('code', 'feed')->first();
        if (! $source) {
            $this->error('Source "feed" not found in sources table. Seed or create it first.');

            return Command::FAILURE;
        }

        $feedDir = storage_path('app/feed/raw');
        if (! is_dir($feedDir)) {
            $this->error("Feed directory missing: {$feedDir}. Run: php artisan feed:download");

            return Command::FAILURE;
        }

        $required = ['blocks.json', 'buildings.json', 'apartments.json'];
        foreach ($required as $file) {
            $path = $feedDir.DIRECTORY_SEPARATOR.$file;
            if (! is_file($path)) {
                $this->error("Required file missing: {$file}. Run: php artisan feed:download");

                return Command::FAILURE;
            }
        }

        $sourceId = (int) $source->id;
        $this->line("Source ID: {$sourceId}");
        $this->line("Feed dir: {$feedDir}");
        $this->newLine();

        $started = microtime(true);
        try {
            $result = $importer->importFullFeed($feedDir, $sourceId);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
            $this->line($e->getTraceAsString());

            return Command::FAILURE;
        }

        $sec = round(microtime(true) - $started, 2);
        $this->info("✅ importFullFeed finished in {$sec}s");
        $this->newLine();

        foreach ($result as $key => $stats) {
            if (! is_array($stats)) {
                continue;
            }
            $line = json_encode($stats, JSON_UNESCAPED_UNICODE);
            $this->line("  {$key}: {$line}");
        }

        return Command::SUCCESS;
    }
}

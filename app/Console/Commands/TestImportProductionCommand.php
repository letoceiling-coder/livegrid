<?php

namespace App\Console\Commands;

use App\Services\Catalog\Import\FeedImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TestImportProductionCommand extends Command
{
    protected $signature = 'import:test-production';
    protected $description = 'Run full production import test';

    public function handle(): int
    {
        $this->info('=== PRODUCTION IMPORT VALIDATION TEST ===');
        $this->newLine();

        // STEP 0: Clean start - truncate tables
        $this->info('STEP 0: Cleaning tables (clean start)...');
        if ($this->confirm('Truncate apartments, buildings, blocks?', true)) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            DB::table('apartments')->truncate();
            DB::table('buildings')->truncate();
            DB::table('blocks')->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            $this->info('  ✓ Tables truncated');
        } else {
            $this->warn('  Skipping truncate - using existing data');
        }
        $this->newLine();

        // STEP 1: Check/Create source
        $this->info('STEP 1: Checking source...');
        $source = DB::table('sources')->where('code', 'feed')->first();
        if (!$source) {
            $this->warn('Creating source "feed"...');
            $sourceId = DB::table('sources')->insertGetId([
                'code' => 'feed',
                'name' => 'Feed Import',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->info("Source created with ID: {$sourceId}");
        } else {
            $sourceId = $source->id;
            $this->info("Source exists with ID: {$sourceId}");
        }
        $this->newLine();

        // STEP 2: Check feed files
        $this->info('STEP 2: Checking feed files...');
        $feedDir = storage_path('app/feed/raw');
        $requiredFiles = [
            'regions.json',
            'subways.json',
            'builders.json',
            'finishings.json',
            'buildingtypes.json',
            'rooms.json',
            'blocks.json',
            'buildings.json',
            'apartments.json',
        ];

        $allExist = true;
        foreach ($requiredFiles as $file) {
            $path = $feedDir . '/' . $file;
            if (file_exists($path)) {
                $size = filesize($path);
                $sizeMB = round($size / 1024 / 1024, 2);
                $this->line("  ✓ {$file} ({$sizeMB} MB)");
                if ($file === 'apartments.json' && $sizeMB < 100) {
                    $this->warn("    WARNING: apartments.json is less than 100MB");
                }
            } else {
                $this->error("  ✗ {$file} - MISSING");
                $allExist = false;
            }
        }

        if (!$allExist) {
            $this->newLine();
            $this->warn('Some feed files are missing. Run: php artisan feed:download');
            if (!$this->confirm('Continue anyway?', false)) {
                return Command::FAILURE;
            }
        }
        $this->newLine();

        // STEP 3: First import (full feed in correct order)
        $this->info('STEP 3: Running first import (full feed)...');
        $feedDir = storage_path('app/feed/raw');

        $importer = app(FeedImporter::class);

        $firstStartTime = microtime(true);
        try {
            $result1 = $importer->importFullFeed($feedDir, $sourceId);
            $firstRunDuration = round(microtime(true) - $firstStartTime, 2);

            $this->info("First import completed in {$firstRunDuration} seconds");
            $this->newLine();
            $this->info('RESULT 1 (Full Feed):');
            
            // Display reference tables stats
            foreach ($result1 as $key => $stats) {
                if (str_starts_with($key, 'reference_')) {
                    $table = str_replace('reference_', '', $key);
                    $this->line("  {$table}: processed={$stats['processed']}, created={$stats['created']}, updated={$stats['updated']}, errors={$stats['errors']}");
                }
            }
            
            // Display blocks stats
            if (isset($result1['blocks'])) {
                $stats = $result1['blocks'];
                $skipped = isset($stats['skipped']) ? $stats['skipped'] : 0;
                $this->line("  blocks: processed={$stats['processed']}, created={$stats['created']}, updated={$stats['updated']}, errors={$stats['errors']}, skipped={$skipped}");
            }
            
            // Display buildings stats
            if (isset($result1['buildings'])) {
                $stats = $result1['buildings'];
                $skipped = isset($stats['skipped']) ? $stats['skipped'] : 0;
                $this->line("  buildings: processed={$stats['processed']}, created={$stats['created']}, updated={$stats['updated']}, errors={$stats['errors']}, skipped={$skipped}");
            }
            
            // Display apartments stats
            if (isset($result1['apartments'])) {
                $stats = $result1['apartments'];
                $archived = isset($stats['archived']) ? $stats['archived'] : 0;
                $skipped = isset($stats['skipped']) ? $stats['skipped'] : 0;
                $this->line("  apartments: processed={$stats['processed']}, created={$stats['created']}, updated={$stats['updated']}, archived={$archived}, errors={$stats['errors']}, skipped={$skipped}");
            }
            if (isset($result1['apartments'])) {
                $this->line("  Completed: " . (($result1['apartments']['completed'] ?? false) ? 'YES' : 'NO'));
            }
        } catch (\Exception $e) {
            $this->error("ERROR: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return Command::FAILURE;
        }
        $this->newLine();

        // STEP 4: Database checks after first import
        $this->info('STEP 4: Database validation after first import...');
        $this->newLine();

        // CHECK 1: Counts
        $this->info('CHECK 1: Counts');
        $totalApartments = DB::table('apartments')->count();
        $totalBuildings = DB::table('buildings')->count();
        $totalBlocks = DB::table('blocks')->count();
        $this->line("  Apartments: {$totalApartments}");
        $this->line("  Buildings: {$totalBuildings}");
        $this->line("  Blocks: {$totalBlocks}");
        $this->newLine();

        // CHECK 2: Duplicates
        $this->info('CHECK 2: Duplicates check');
        $duplicates = DB::select("
            SELECT source_id, external_id, COUNT(*) as cnt
            FROM apartments
            GROUP BY source_id, external_id
            HAVING COUNT(*) > 1
        ");
        $duplicateCount = count($duplicates);
        $this->line("  Duplicates found: {$duplicateCount}");
        if ($duplicateCount === 0) {
            $this->info("  ✓ PASS: No duplicates");
        } else {
            $this->error("  ✗ FAIL: Found {$duplicateCount} duplicate(s)");
            foreach (array_slice($duplicates, 0, 5) as $dup) {
                $this->line("    - source_id={$dup->source_id}, external_id={$dup->external_id}, count={$dup->cnt}");
            }
        }
        $this->newLine();

        // CHECK 3: Null foreign keys
        $this->info('CHECK 3: Null foreign keys');
        $nullBuildingId = DB::table('apartments')->whereNull('building_id')->count();
        $nullBlockId = DB::table('apartments')->whereNull('block_id')->count();
        $this->line("  Apartments without building_id: {$nullBuildingId}");
        $this->line("  Apartments without block_id: {$nullBlockId}");
        if ($nullBuildingId === 0 && $nullBlockId === 0) {
            $this->info("  ✓ PASS: No null foreign keys");
        } else {
            $this->error("  ✗ FAIL: Found null foreign keys");
        }
        $this->newLine();

        // CHECK 4: Sample data
        $this->info('CHECK 4: Sample data (5 random apartments)');
        $samples = DB::table('apartments')
            ->inRandomOrder()
            ->limit(5)
            ->get(['id', 'external_id', 'price', 'rooms_count', 'floor', 'floors', 'area_total', 'lat', 'lng', 'building_id', 'block_id']);
        
        foreach ($samples as $idx => $apt) {
            $this->line("  Sample " . ($idx + 1) . ":");
            $this->line("    ID: {$apt->id}");
            $this->line("    External ID: {$apt->external_id}");
            $this->line("    Price: {$apt->price}");
            $this->line("    Rooms: {$apt->rooms_count}");
            $this->line("    Floor: {$apt->floor}/{$apt->floors}");
            $this->line("    Area: {$apt->area_total}");
            $this->line("    Coords: " . ($apt->lat ? "{$apt->lat}, {$apt->lng}" : "NULL"));
            $this->line("    Building ID: {$apt->building_id}");
            $this->line("    Block ID: {$apt->block_id}");
        }
        $this->newLine();

        $this->newLine();

        // STEP 5: Second import (idempotency test)
        $this->info('STEP 5: Running second import (idempotency test)...');
        $this->line("  First run duration: {$firstRunDuration} seconds");
        $this->newLine();

        $secondStartTime = microtime(true);
        try {
            $result2 = $importer->importFullFeed($feedDir, $sourceId);
            $secondRunDuration = round(microtime(true) - $secondStartTime, 2);

            $this->info("Second import completed in {$secondRunDuration} seconds");
            $this->newLine();
            $this->info('RESULT 2 (Full Feed):');
            
            // Display apartments stats
            if (isset($result2['apartments'])) {
                $stats = $result2['apartments'];
                $unchanged = isset($stats['unchanged']) ? $stats['unchanged'] : 0;
                $archived = isset($stats['archived']) ? $stats['archived'] : 0;
                $skipped = isset($stats['skipped']) ? $stats['skipped'] : 0;
                $completed = isset($stats['completed']) ? $stats['completed'] : false;
                $this->line("  apartments: processed={$stats['processed']}, created={$stats['created']}, updated={$stats['updated']}, unchanged={$unchanged}, archived={$archived}, errors={$stats['errors']}, skipped={$skipped}");
                $this->line("  Completed: " . ($completed ? 'YES' : 'NO'));
            }
        } catch (\Exception $e) {
            $this->error("ERROR: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return Command::FAILURE;
        }
        $this->newLine();

        // STEP 6: Validation after second import
        $this->info('STEP 6: Validation after second import...');
        $this->newLine();

        // CHECK 5: Counts unchanged
        $this->info('CHECK 5: Counts unchanged');
        $totalAfter = DB::table('apartments')->count();
        $this->line("  Apartments BEFORE: {$totalApartments}");
        $this->line("  Apartments AFTER: {$totalAfter}");
        if ($totalApartments === $totalAfter) {
            $this->info("  ✓ PASS: Count unchanged (idempotency OK)");
        } else {
            $this->error("  ✗ FAIL: Count changed by " . ($totalAfter - $totalApartments));
        }
        $this->newLine();

        // CHECK 6: Unchanged stats
        $this->info('CHECK 6: Unchanged records');
        $apartmentsStats = isset($result2['apartments']) ? $result2['apartments'] : [];
        $unchangedCount = isset($apartmentsStats['unchanged']) ? $apartmentsStats['unchanged'] : 0;
        $processedCount = isset($apartmentsStats['processed']) ? $apartmentsStats['processed'] : 0;
        $unchangedPercent = $processedCount > 0 ? round(($unchangedCount / $processedCount) * 100, 2) : 0;
        $this->line("  Unchanged: {$unchangedCount} ({$unchangedPercent}%)");
        $this->line("  Updated: " . (isset($apartmentsStats['updated']) ? $apartmentsStats['updated'] : 0));
        $this->line("  Created: " . (isset($apartmentsStats['created']) ? $apartmentsStats['created'] : 0));
        
        if ($unchangedPercent > 80) {
            $this->info("  ✓ PASS: Most records unchanged (optimization working)");
        } elseif ($unchangedPercent > 50) {
            $this->warn("  ⚠ WARNING: Only {$unchangedPercent}% unchanged (expected >80%)");
        } else {
            $this->error("  ✗ FAIL: Only {$unchangedPercent}% unchanged (optimization not working)");
        }
        $this->newLine();

        // CHECK 7: Updated records
        $this->info('CHECK 7: Updated records validation');
        $updatedCount = isset($apartmentsStats['updated']) ? $apartmentsStats['updated'] : 0;
        if ($updatedCount === 0) {
            $this->info("  ✓ PASS: No updates (all records unchanged)");
        } elseif ($updatedCount < $unchangedCount) {
            $this->info("  ✓ PASS: Updates ({$updatedCount}) < Unchanged ({$unchangedCount})");
        } else {
            $this->warn("  ⚠ WARNING: More updates than unchanged records");
        }
        $this->newLine();

        // Performance comparison
        $this->info('PERFORMANCE COMPARISON:');
        $speedup = $firstRunDuration > 0 ? round($firstRunDuration / max($secondRunDuration, 0.1), 2) : 0;
        $this->line("  First run: {$firstRunDuration} seconds");
        $this->line("  Second run: {$secondRunDuration} seconds");
        $this->line("  Speedup: {$speedup}x");
        if ($secondRunDuration < $firstRunDuration * 0.5) {
            $this->info("  ✓ PASS: Second run is MUCH faster (>2x speedup)");
        } elseif ($secondRunDuration < $firstRunDuration) {
            $this->warn("  ⚠ WARNING: Second run is faster but not MUCH faster");
        } else {
            $this->error("  ✗ FAIL: Second run is NOT faster");
        }
        $this->newLine();

        // STEP 7: Final summary
        $this->info('STEP 7: Final summary');
        $this->newLine();
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Apartments', $totalAfter],
                ['Total Buildings', $totalBuildings],
                ['Total Blocks', $totalBlocks],
                ['Duplicates', $duplicateCount === 0 ? '0 ✓' : "{$duplicateCount} ✗"],
                ['Null building_id', $nullBuildingId === 0 ? '0 ✓' : "{$nullBuildingId} ✗"],
                ['Null block_id', $nullBlockId === 0 ? '0 ✓' : "{$nullBlockId} ✗"],
                ['First run duration', "{$firstRunDuration}s"],
                ['Second run duration', "{$secondRunDuration}s"],
                ['Speedup', "{$speedup}x"],
                ['Unchanged records', "{$unchangedCount} ({$unchangedPercent}%)"],
                ['Updated records', $updatedCount],
                ['Created records', isset($apartmentsStats['created']) ? $apartmentsStats['created'] : 0],
            ]
        );
        $this->newLine();

        // Final status
        $allPassed = $duplicateCount === 0 
            && $nullBuildingId === 0 
            && $nullBlockId === 0 
            && $totalApartments === $totalAfter
            && $unchangedPercent > 80
            && $secondRunDuration < $firstRunDuration * 0.5;

        if ($allPassed) {
            $this->info('=== ✓ ALL TESTS PASSED ===');
            return Command::SUCCESS;
        } else {
            $this->warn('=== ⚠ SOME TESTS FAILED - CHECK ABOVE ===');
            return Command::FAILURE;
        }
    }
}

<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "=== PRODUCTION IMPORT TEST ===\n\n";

// STEP 1: Check source
echo "STEP 1: Checking source...\n";
$source = DB::table('sources')->where('code', 'feed')->first();
if (!$source) {
    echo "Creating source 'feed'...\n";
    $sourceId = DB::table('sources')->insertGetId([
        'code' => 'feed',
        'name' => 'Feed Import',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    echo "Source created with ID: {$sourceId}\n";
} else {
    $sourceId = $source->id;
    echo "Source exists with ID: {$sourceId}\n";
}
echo "\n";

// STEP 2: Check feed files
echo "STEP 2: Checking feed files...\n";
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
        echo "  ✓ {$file} ({$sizeMB} MB)\n";
        if ($file === 'apartments.json' && $sizeMB < 100) {
            echo "    WARNING: apartments.json is less than 100MB\n";
        }
    } else {
        echo "  ✗ {$file} - MISSING\n";
        $allExist = false;
    }
}

if (!$allExist) {
    echo "\nDownloading feed files...\n";
    Artisan::call('feed:download');
    echo Artisan::output();
}

echo "\n";

// STEP 3: First import
echo "STEP 3: Running first import...\n";
$apartmentsFile = storage_path('app/feed/raw/apartments.json');
if (!file_exists($apartmentsFile)) {
    die("ERROR: apartments.json not found!\n");
}

$importer = app(\App\Services\Catalog\Import\FeedImporter::class);

$startTime = microtime(true);
try {
    $result1 = $importer->importFromFile($apartmentsFile, $sourceId);
    $duration = round(microtime(true) - $startTime, 2);
    
    echo "Import completed in {$duration} seconds\n";
    echo "RESULT 1:\n";
    echo "  Processed: {$result1['processed']}\n";
    echo "  Created: {$result1['created']}\n";
    echo "  Updated: {$result1['updated']}\n";
    echo "  Archived: {$result1['archived']}\n";
    echo "  Errors: {$result1['errors']}\n";
    echo "  Completed: " . ($result1['completed'] ? 'YES' : 'NO') . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    die();
}

echo "\n";

// STEP 4: Database checks
echo "STEP 4: Database validation...\n";

// Total apartments
$total = DB::table('apartments')->count();
echo "  Total apartments: {$total}\n";

// Active apartments
$active = DB::table('apartments')->where('is_active', 1)->count();
echo "  Active apartments: {$active}\n";

// Duplicates
$duplicates = DB::table('apartments')
    ->select('source_id', 'external_id', DB::raw('COUNT(*) as count'))
    ->groupBy('source_id', 'external_id')
    ->having('count', '>', 1)
    ->count();
echo "  Duplicates: {$duplicates}\n";
if ($duplicates > 0) {
    echo "    WARNING: Found duplicates!\n";
}

// Null checks
$nullExternalId = DB::table('apartments')->whereNull('external_id')->count();
$nullSourceId = DB::table('apartments')->whereNull('source_id')->count();
echo "  NULL external_id: {$nullExternalId}\n";
echo "  NULL source_id: {$nullSourceId}\n";

// Orphans
$orphanApartments = DB::table('apartments')->whereNull('building_id')->count();
$orphanBuildings = DB::table('buildings')->whereNull('block_id')->count();
echo "  Orphan apartments (no building): {$orphanApartments}\n";
echo "  Orphan buildings (no block): {$orphanBuildings}\n";

// Attributes
$attributes = DB::table('apartment_attributes')->count();
echo "  Apartment attributes: {$attributes}\n";

echo "\n";

// STEP 5: Second import (idempotency test)
echo "STEP 5: Running second import (idempotency test)...\n";
$startTime = microtime(true);
try {
    $result2 = $importer->importFromFile($apartmentsFile, $sourceId);
    $duration = round(microtime(true) - $startTime, 2);
    
    echo "Import completed in {$duration} seconds\n";
    echo "RESULT 2:\n";
    echo "  Processed: {$result2['processed']}\n";
    echo "  Created: {$result2['created']}\n";
    echo "  Updated: {$result2['updated']}\n";
    echo "  Archived: {$result2['archived']}\n";
    echo "  Errors: {$result2['errors']}\n";
    echo "  Completed: " . ($result2['completed'] ? 'YES' : 'NO') . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    die();
}

echo "\n";

// STEP 6: Validation
echo "STEP 6: Validation...\n";
$totalAfter = DB::table('apartments')->count();
echo "  Total apartments BEFORE: {$total}\n";
echo "  Total apartments AFTER: {$totalAfter}\n";

if ($total === $totalAfter) {
    echo "  ✓ Total count unchanged (idempotency OK)\n";
} else {
    echo "  ✗ Total count changed: " . ($totalAfter - $total) . "\n";
}

if ($result2['created'] === 0 || $result2['created'] < 10) {
    echo "  ✓ Created count is low (idempotency OK)\n";
} else {
    echo "  ✗ Created count is high: {$result2['created']}\n";
}

if ($result2['updated'] > 0) {
    echo "  ✓ Updated count is high: {$result2['updated']} (idempotency OK)\n";
} else {
    echo "  ✗ Updated count is zero\n";
}

// Check duplicates again
$duplicatesAfter = DB::table('apartments')
    ->select('source_id', 'external_id', DB::raw('COUNT(*) as count'))
    ->groupBy('source_id', 'external_id')
    ->having('count', '>', 1)
    ->count();
echo "  Duplicates after second import: {$duplicatesAfter}\n";
if ($duplicatesAfter === 0) {
    echo "  ✓ No duplicates (constraint OK)\n";
} else {
    echo "  ✗ Found duplicates!\n";
}

echo "\n";

// STEP 7: Log check
echo "STEP 7: Checking logs...\n";
$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile);
    
    // Check for SQL errors
    $sqlErrors = substr_count($logContent, 'SQLSTATE');
    $constraintViolations = substr_count($logContent, 'Integrity constraint violation');
    
    echo "  SQL errors found: {$sqlErrors}\n";
    echo "  Constraint violations: {$constraintViolations}\n";
    
    if ($sqlErrors === 0 && $constraintViolations === 0) {
        echo "  ✓ No critical errors in logs\n";
    } else {
        echo "  ✗ Found errors in logs - check storage/logs/laravel.log\n";
    }
} else {
    echo "  Log file not found\n";
}

echo "\n=== TEST COMPLETE ===\n";

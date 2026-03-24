<?php
require '/var/www/livegrid/vendor/autoload.php';
$app = require '/var/www/livegrid/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$imp = app(App\Services\Catalog\Import\BlockImporter::class);

// Get source_id (first source)
$source = \Illuminate\Support\Facades\DB::table('sources')->first();
if (!$source) {
    echo "No source found\n";
    exit(1);
}
$sourceId = $source->id;
echo "Using source_id={$sourceId}\n";

$feedFile = '/var/www/ta-feed/storage/app/feeds/msk/blocks.json';
if (!file_exists($feedFile)) {
    $feedFile = '/var/www/livegrid/storage/app/feed/raw/blocks.json';
}
echo "Feed file: {$feedFile}\n";

$stats = $imp->importFromFile($feedFile, $sourceId);
echo "Blocks import: " . json_encode($stats) . "\n";

// Check how many blocks now have images
$cnt = \Illuminate\Support\Facades\DB::table('blocks')->whereNotNull('images')->where('images', '!=', '[]')->where('images', '!=', 'null')->count();
echo "Blocks with images: {$cnt}\n";

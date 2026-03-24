<?php
require '/var/www/livegrid/vendor/autoload.php';
$app = require '/var/www/livegrid/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$imp = app(App\Services\Catalog\Import\ReferenceImporter::class);
$stats = $imp->importFromFile('/var/www/ta-feed/storage/app/feeds/msk/room.json', 'rooms');
echo "Import stats: " . json_encode($stats) . "\n";

$rows = \Illuminate\Support\Facades\DB::table('rooms')->orderBy('crm_id')->get();
foreach ($rows as $r) {
    echo "crm_id={$r->crm_id} name={$r->name} name_one={$r->name_one} cat={$r->room_category}\n";
}

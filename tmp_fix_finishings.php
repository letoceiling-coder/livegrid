<?php

declare(strict_types=1);

use App\Services\CacheInvalidator;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

echo "BEFORE_DUPS\n";
$before = DB::table('finishings')
    ->selectRaw('id, COUNT(*) as c')
    ->groupBy('id')
    ->havingRaw('COUNT(*) > 1')
    ->get();
foreach ($before as $row) {
    echo $row->id."\t".$row->c."\n";
}

echo "BEFORE_ID58\n";
$before58 = DB::table('finishings')->where('id', 58)->get(['id', 'name']);
foreach ($before58 as $row) {
    echo $row->id."\t".$row->name."\n";
}

$dupIds = DB::table('finishings')
    ->select('id')
    ->groupBy('id')
    ->havingRaw('COUNT(*) > 1')
    ->pluck('id');

foreach ($dupIds as $id) {
    $keepName = DB::table('finishings')->where('id', $id)->min('name');

    DB::table('finishings')
        ->where('id', $id)
        ->where('name', '!=', $keepName)
        ->delete();

    while (DB::table('finishings')->where('id', $id)->count() > 1) {
        DB::statement('DELETE FROM finishings WHERE id = ? LIMIT 1', [$id]);
    }
}

try {
    Cache::tags(['apartments'])->flush();
} catch (BadMethodCallException) {
    // ignore if cache driver has no tags
}
CacheInvalidator::all();

echo "AFTER_DUPS\n";
$after = DB::table('finishings')
    ->selectRaw('id, COUNT(*) as c')
    ->groupBy('id')
    ->havingRaw('COUNT(*) > 1')
    ->get();
foreach ($after as $row) {
    echo $row->id."\t".$row->c."\n";
}

echo "AFTER_ID58\n";
$after58 = DB::table('finishings')->where('id', 58)->get(['id', 'name']);
foreach ($after58 as $row) {
    echo $row->id."\t".$row->name."\n";
}


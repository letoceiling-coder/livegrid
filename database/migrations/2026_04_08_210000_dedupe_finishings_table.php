<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Оставляет одну строку на каждый id: каноническое имя — MIN(name) по id.
 * При нескольких строках с тем же (id, name) удаляет лишние по одной (DELETE … LIMIT 1).
 *
 * Проверка вручную (до миграции):
 * SELECT id, COUNT(*) FROM finishings GROUP BY id HAVING COUNT(*) > 1;
 * SELECT * FROM finishings WHERE id = 58;
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('finishings')) {
            return;
        }

        $dupIds = DB::table('finishings')
            ->select('id')
            ->groupBy('id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('id');

        foreach ($dupIds as $id) {
            $keepName = DB::table('finishings')->where('id', $id)->min('name');

            DB::table('finishings')->where('id', $id)->where('name', '!=', $keepName)->delete();

            while (DB::table('finishings')->where('id', $id)->count() > 1) {
                $driver = DB::connection()->getDriverName();
                if (in_array($driver, ['mysql', 'sqlite'], true)) {
                    DB::statement('DELETE FROM finishings WHERE id = ? LIMIT 1', [$id]);
                } else {
                    $row = DB::table('finishings')->where('id', $id)->orderBy('name')->first();
                    if ($row) {
                        DB::table('finishings')->where('id', $id)->where('name', $row->name)->limit(1)->delete();
                    } else {
                        break;
                    }
                }
            }
        }
    }

    public function down(): void
    {
        //
    }
};

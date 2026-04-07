<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rebuilds materialized apartments_search table (CREATE TABLE AS SELECT).
 */
class ApartmentsSearchRefresher
{
    public function refresh(): void
    {
        if (! Schema::hasTable('apartments')) {
            return;
        }

        Schema::dropIfExists('apartments_search');

        DB::statement('
            CREATE TABLE apartments_search AS
            SELECT
                a.id,
                a.price,
                a.rooms_count,
                a.area_total,
                a.floor,
                b.deadline,
                bl.district_id,
                bl.name AS block_name,
                a.finishing_id
            FROM apartments a
            JOIN buildings b ON a.building_id = b.id
            JOIN blocks bl ON b.block_id = bl.id
        ');

        DB::statement('ALTER TABLE apartments_search ADD PRIMARY KEY (id)');
        DB::statement('CREATE INDEX apartments_search_price_idx ON apartments_search (price)');
        DB::statement('CREATE INDEX apartments_search_rooms_count_idx ON apartments_search (rooms_count)');
        DB::statement('CREATE INDEX apartments_search_area_total_idx ON apartments_search (area_total)');
        DB::statement('CREATE INDEX apartments_search_deadline_idx ON apartments_search (deadline)');
        DB::statement('CREATE INDEX apartments_search_district_id_idx ON apartments_search (district_id)');
        DB::statement('CREATE INDEX apartments_search_finishing_id_idx ON apartments_search (finishing_id)');
    }
}

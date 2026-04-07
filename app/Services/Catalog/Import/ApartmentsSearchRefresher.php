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

        $wcExpr = $this->attributeSelect('wc_count', 'value_int');
        $heightExpr = $this->attributeSelect('height', 'value_float');
        $numberExpr = $this->attributeSelect('number', 'value_string');

        $sql = "
            CREATE TABLE apartments_search AS
            SELECT
                a.id,
                a.block_id,
                a.building_id,
                a.price,
                a.rooms_count,
                a.area_total,
                a.floor,
                a.floors,
                a.status,
                a.is_active,
                b.deadline,
                bl.district_id,
                bl.name AS block_name,
                a.finishing_id,
                {$wcExpr},
                {$heightExpr},
                {$numberExpr}
            FROM apartments a
            JOIN buildings b ON a.building_id = b.id
            JOIN blocks bl ON b.block_id = bl.id
            WHERE a.deleted_at IS NULL
        ";

        DB::statement($sql);

        DB::statement('ALTER TABLE apartments_search ADD PRIMARY KEY (id)');
        DB::statement('CREATE INDEX apartments_search_price_idx ON apartments_search (price)');
        DB::statement('CREATE INDEX apartments_search_rooms_count_idx ON apartments_search (rooms_count)');
        DB::statement('CREATE INDEX apartments_search_area_total_idx ON apartments_search (area_total)');
        DB::statement('CREATE INDEX apartments_search_deadline_idx ON apartments_search (deadline)');
        DB::statement('CREATE INDEX apartments_search_district_id_idx ON apartments_search (district_id)');
        DB::statement('CREATE INDEX apartments_search_finishing_id_idx ON apartments_search (finishing_id)');
        DB::statement('CREATE INDEX apartments_search_block_id_idx ON apartments_search (block_id)');
        DB::statement('CREATE INDEX apartments_search_status_idx ON apartments_search (status)');
        DB::statement('CREATE INDEX apartments_search_is_active_idx ON apartments_search (is_active)');
        DB::statement('CREATE INDEX apartments_search_floor_idx ON apartments_search (floor)');
        DB::statement('CREATE INDEX apartments_search_wc_count_idx ON apartments_search (wc_count)');
    }

    private function attributeSelect(string $code, string $valueColumn): string
    {
        if (! Schema::hasTable('apartment_attributes') || ! Schema::hasTable('attributes')) {
            return "NULL AS `{$code}`";
        }

        $codeEscaped = str_replace("'", "''", $code);

        return "(SELECT aa.{$valueColumn} FROM apartment_attributes aa INNER JOIN attributes att ON att.id = aa.attribute_id AND att.code = '{$codeEscaped}' WHERE aa.apartment_id = a.id LIMIT 1) AS `{$code}`";
    }
}

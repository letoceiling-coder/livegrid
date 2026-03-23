<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite covering index for the most frequent public-API apartment query:
 *   WHERE is_active=1 AND status IN ('available','reserved') ORDER BY price ASC
 * and for the sync aggregation:
 *   WHERE block_id IN (...) AND is_active=1 AND status IN ('available','reserved')
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // Covering index for public listing + price sort
            if (!$this->indexExists('apartments', 'apartments_active_status_price_idx')) {
                $table->index(['is_active', 'status', 'price'], 'apartments_active_status_price_idx');
            }

            // Covering index for sync batch aggregation per complex
            if (!$this->indexExists('apartments', 'apartments_block_status_active_idx')) {
                $table->index(['block_id', 'status', 'is_active'], 'apartments_block_status_active_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropIndexIfExists('apartments_active_status_price_idx');
            $table->dropIndexIfExists('apartments_block_status_active_idx');
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $indexes = \Illuminate\Support\Facades\DB::select(
            "SHOW INDEX FROM `{$table}` WHERE Key_name = ?",
            [$indexName]
        );
        return count($indexes) > 0;
    }
};

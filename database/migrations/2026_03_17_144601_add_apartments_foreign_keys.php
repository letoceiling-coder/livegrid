<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add foreign keys for apartments after all referenced tables are created
        if (Schema::hasTable('apartments')) {
            Schema::table('apartments', function (Blueprint $table) {
                if (Schema::hasTable('sources')) {
                    $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
                }
                if (Schema::hasTable('buildings')) {
                    $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
                }
                if (Schema::hasTable('blocks')) {
                    $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('apartments')) {
            Schema::table('apartments', function (Blueprint $table) {
                $table->dropForeign(['source_id']);
                $table->dropForeign(['building_id']);
                $table->dropForeign(['block_id']);
            });
        }
    }
};

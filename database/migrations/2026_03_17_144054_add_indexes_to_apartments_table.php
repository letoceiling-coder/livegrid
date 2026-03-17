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
        Schema::table('apartments', function (Blueprint $table) {
            $table->index(['price', 'rooms_count'], 'apartments_price_rooms_index');
            $table->index('block_id');
            $table->index('builder_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropIndex('apartments_price_rooms_index');
            $table->dropIndex(['block_id']);
            $table->dropIndex(['builder_id']);
            $table->dropIndex(['is_active']);
        });
    }
};

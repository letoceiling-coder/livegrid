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
        // Add foreign key for block_id after blocks table is created
        if (Schema::hasTable('buildings') && Schema::hasTable('blocks')) {
            Schema::table('buildings', function (Blueprint $table) {
                $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('buildings')) {
            Schema::table('buildings', function (Blueprint $table) {
                $table->dropForeign(['block_id']);
            });
        }
    }
};

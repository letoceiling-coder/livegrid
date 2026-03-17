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
        Schema::table('buildings', function (Blueprint $table) {
            // Make source_id and external_id NOT NULL
            $table->foreignId('source_id')->nullable(false)->change();
            $table->string('external_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable()->change();
            $table->string('external_id')->nullable()->change();
        });
    }
};

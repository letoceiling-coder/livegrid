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
        Schema::table('blocks', function (Blueprint $table) {
            $table->string('builder_id')->nullable()->after('district_id');
            $table->foreignId('source_id')->nullable()->after('builder_id');
            $table->string('external_id')->nullable()->after('source_id');
            
            // Note: unique constraint allows multiple NULLs in MySQL
            // For proper uniqueness, ensure source_id is set when external_id is set
            
            $table->foreign('builder_id')->references('id')->on('builders')->nullOnDelete();
            $table->foreign('source_id')->references('id')->on('sources')->nullOnDelete();
            $table->unique(['source_id', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropUnique(['source_id', 'external_id']);
            $table->dropForeign(['builder_id']);
            $table->dropForeign(['source_id']);
            $table->dropColumn(['builder_id', 'source_id', 'external_id']);
        });
    }
};

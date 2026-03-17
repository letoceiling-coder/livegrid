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
            $table->foreignId('source_id')->nullable()->after('id');
            $table->string('external_id')->nullable()->after('source_id');
            
            $table->foreign('source_id')->references('id')->on('sources')->nullOnDelete();
            $table->unique(['source_id', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropUnique(['source_id', 'external_id']);
            $table->dropForeign(['source_id']);
            $table->dropColumn(['source_id', 'external_id']);
        });
    }
};

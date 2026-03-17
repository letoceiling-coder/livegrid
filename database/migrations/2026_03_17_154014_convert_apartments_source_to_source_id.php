<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add source_id column
        Schema::table('apartments', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable()->after('id');
        });

        // Populate source_id from sources table
        DB::statement("
            UPDATE apartments a
            INNER JOIN sources s ON s.code = a.source
            SET a.source_id = s.id
        ");

        // Make source_id NOT NULL
        Schema::table('apartments', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable(false)->change();
            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
        });

        // Drop old source column
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->string('source')->after('id');
        });

        DB::statement("
            UPDATE apartments a
            INNER JOIN sources s ON s.id = a.source_id
            SET a.source = s.code
        ");

        Schema::table('apartments', function (Blueprint $table) {
            $table->dropForeign(['source_id']);
            $table->dropColumn('source_id');
        });
    }
};

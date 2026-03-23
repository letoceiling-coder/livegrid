<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // 'source' = feed | manual — separate from source_id (feed source name)
            if (!Schema::hasColumn('apartments', 'source')) {
                $table->string('source', 20)->default('feed')->index();
            }
        });

        // Backfill: any apartment with is_active=1 from feed stays as 'feed'
        // Manual ones will be updated when CRM edits happen
        DB::table('apartments')->whereNull('source')->update(['source' => 'feed']);
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};

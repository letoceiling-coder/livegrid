<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // S1: Feed safety — locked_fields prevents feed from overwriting manual edits
            if (!Schema::hasColumn('apartments', 'locked_fields')) {
                $table->json('locked_fields')->nullable();
            }
            // S4: Soft delete
            if (!Schema::hasColumn('apartments', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropColumn(['locked_fields', 'deleted_at']);
        });
    }
};

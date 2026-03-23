<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('complexes_search')) {
            return;
        }

        Schema::table('complexes_search', function (Blueprint $table) {
            $table->string('district_id')->nullable()->change();
            $table->string('district_name')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('complexes_search', function (Blueprint $table) {
            $table->string('district_id')->nullable(false)->change();
            $table->string('district_name')->nullable(false)->change();
        });
    }
};

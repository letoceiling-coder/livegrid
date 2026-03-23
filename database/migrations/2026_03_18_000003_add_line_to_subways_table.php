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
        Schema::table('subways', function (Blueprint $table) {
            if (!Schema::hasColumn('subways', 'line')) {
                $table->string('line')->nullable()->after('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subways', function (Blueprint $table) {
            $table->dropColumn('line');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            if (!Schema::hasColumn('buildings', 'floors')) {
                $table->unsignedSmallInteger('floors')->default(0)->after('deadline');
            }
            if (!Schema::hasColumn('buildings', 'sections')) {
                $table->unsignedSmallInteger('sections')->default(1)->after('floors');
            }
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropColumn(['floors', 'sections']);
        });
    }
};
